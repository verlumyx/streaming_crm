import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { knowledgeChunks, knowledgeDocuments } from '@/modules/knowledge/models/knowledge.model';
import { createKnowledgeContainer } from '@/modules/knowledge/container';
import { RetrieveKnowledgeCommand } from '@/modules/knowledge/commands/retrieve-knowledge.command';
import { initialActionState } from '@/modules/shared/actions/action-state';
import { uuidv7 } from '@/modules/shared/uuid';
import {
  createKnowledgeDocumentAction,
  reingestKnowledgeDocumentAction,
  updateKnowledgeDocumentAction,
  updateKnowledgeDocumentStatusAction,
} from '@/app/[companyId]/bot/knowledge/actions';
import { resetDb } from '../../../helpers/reset-db';
import { expectRedirect, setSessionUser } from '../../../helpers/session-mock';
import { assignRoleWithPermissions, createUserWithCompany } from '../../../helpers/company-context';
import { formData } from '../../../helpers/form-data';
import { FakeEmbeddingModel } from '../../../unit/modules/bot/fake-ai';

const embeddings = new FakeEmbeddingModel();
const knowledge = () => createKnowledgeContainer(db, embeddings);

async function ingestStatusOf(id: string) {
  const [row] = await db.select().from(knowledgeDocuments).where(eq(knowledgeDocuments.id, id));
  return row.ingestStatus;
}

async function createDocument(companyId: string, title: string, content: string) {
  const id = uuidv7();
  await expectRedirect(
    createKnowledgeDocumentAction(companyId, initialActionState, formData({ id, title, content })),
    `/${companyId}/bot/knowledge`,
  );
  return id;
}

describe('Base de conocimiento', () => {
  beforeEach(resetDb);

  it('creates a document pending, with a sequential code per company', async () => {
    const { user, company } = await createUserWithCompany(db);
    setSessionUser(user);

    const id = await createDocument(company.id, 'Reembolsos', 'No hay reembolsos después de 7 días.');

    const [row] = await db.select().from(knowledgeDocuments).where(eq(knowledgeDocuments.id, id));
    expect(row).toMatchObject({
      code: 'DOC000001',
      title: 'Reembolsos',
      status: 'active',
      ingestStatus: 'pending',
      chunkCount: 0,
      createdBy: user.id,
    });
    expect(row.contentHash).toHaveLength(64);
  });

  it('requires bot.knowledge-manage to write', async () => {
    const { user, company } = await createUserWithCompany(db);
    await assignRoleWithPermissions(db, user.id, company.id, ['bot.knowledge']);
    setSessionUser(user);

    const state = await createKnowledgeDocumentAction(
      company.id,
      initialActionState,
      formData({ id: uuidv7(), title: 'Reembolsos', content: 'Texto.' }),
    );

    expect(state.status).toBe('error');
    expect(await db.select().from(knowledgeDocuments)).toHaveLength(0);
  });

  it('indexes a pending document into chunks with a 768-dimension embedding', async () => {
    const { user, company } = await createUserWithCompany(db);
    setSessionUser(user);
    const id = await createDocument(
      company.id,
      'Reembolsos',
      'No hay reembolsos después de siete días.\n\nLos cambios de perfil son gratuitos.',
    );

    const report = await knowledge().ingestService.execute();

    expect(report).toEqual({ claimed: 1, indexed: 1, failed: 0 });
    const [row] = await db.select().from(knowledgeDocuments).where(eq(knowledgeDocuments.id, id));
    expect(row).toMatchObject({ ingestStatus: 'indexed', embeddingModel: 'fake-embedding', embeddingDimensions: 768 });

    const chunks = await db.select().from(knowledgeChunks).where(eq(knowledgeChunks.documentId, id));
    expect(chunks).toHaveLength(row.chunkCount);
    expect(chunks[0].embedding).toHaveLength(768);
  });

  it('retrieves the closest document and ranks it first', async () => {
    const { user, company } = await createUserWithCompany(db);
    setSessionUser(user);
    await createDocument(company.id, 'Reembolsos', 'No hacemos reembolsos después de siete días de la compra.');
    await createDocument(company.id, 'Horario', 'Atendemos de lunes a viernes de nueve a seis.');
    await knowledge().ingestService.execute();

    const matches = await knowledge().retrieveService.execute(
      new RetrieveKnowledgeCommand(company.id, 'quiero un reembolso de mi compra', 5, 0),
    );

    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].documentTitle).toBe('Reembolsos');
    expect(matches[0].similarity).toBeGreaterThan(0);
  });

  it('ignores the chunks left behind by the previous embedding model', async () => {
    const { user, company } = await createUserWithCompany(db);
    setSessionUser(user);
    await createDocument(company.id, 'Reembolsos', 'No hacemos reembolsos después de siete días de la compra.');
    await knowledge().ingestService.execute();

    // A cosine distance between vectors of two models still sorts, so an unfiltered search would
    // return this document as a confident match instead of nothing.
    const migrated = createKnowledgeContainer(db, new FakeEmbeddingModel(768, 'otro-modelo'));
    const matches = await migrated.retrieveService.execute(
      new RetrieveKnowledgeCommand(company.id, 'quiero un reembolso', 5, 0),
    );

    expect(matches).toEqual([]);
  });

  it('queues the documents of the previous model for reingest, and only those', async () => {
    const { user, company } = await createUserWithCompany(db);
    setSessionUser(user);
    const stale = await createDocument(company.id, 'Reembolsos', 'No hacemos reembolsos después de siete días.');
    await knowledge().ingestService.execute();
    const pending = await createDocument(company.id, 'Horario', 'Atendemos de lunes a viernes.');

    const queued = await knowledge().repository.markStaleForReingest('otro-modelo');

    expect(queued).toBe(1);
    expect(await ingestStatusOf(stale)).toBe('pending');
    expect(await ingestStatusOf(pending)).toBe('pending');
    // Running it again is a no-op: nothing is indexed with the old model any more.
    expect(await knowledge().repository.markStaleForReingest('otro-modelo')).toBe(0);
  });

  it('re-embeds the queued documents with the new model', async () => {
    const { user, company } = await createUserWithCompany(db);
    setSessionUser(user);
    const id = await createDocument(company.id, 'Reembolsos', 'No hacemos reembolsos después de siete días.');
    await knowledge().ingestService.execute();

    const migrated = createKnowledgeContainer(db, new FakeEmbeddingModel(768, 'otro-modelo'));
    await migrated.repository.markStaleForReingest('otro-modelo');
    await migrated.ingestService.execute();

    const [row] = await db.select().from(knowledgeDocuments).where(eq(knowledgeDocuments.id, id));
    expect(row).toMatchObject({ ingestStatus: 'indexed', embeddingModel: 'otro-modelo' });

    const matches = await migrated.retrieveService.execute(
      new RetrieveKnowledgeCommand(company.id, 'quiero un reembolso', 5, 0),
    );
    expect(matches).not.toHaveLength(0);
  });

  it('never retrieves another company knowledge', async () => {
    const a = await createUserWithCompany(db);
    const b = await createUserWithCompany(db);

    setSessionUser(a.user);
    await createDocument(a.company.id, 'Secreto A', 'El margen de Netflix es del cuarenta por ciento.');
    setSessionUser(b.user);
    await createDocument(b.company.id, 'Secreto B', 'El margen de Netflix es del diez por ciento.');
    await knowledge().ingestService.execute(10);

    const matches = await knowledge().retrieveService.execute(
      new RetrieveKnowledgeCommand(b.company.id, 'margen de Netflix', 5, 0),
    );

    expect(matches).not.toHaveLength(0);
    expect(matches.every((m) => m.documentTitle === 'Secreto B')).toBe(true);
  });

  it('drops a deactivated document from retrieval without deleting it', async () => {
    const { user, company } = await createUserWithCompany(db);
    setSessionUser(user);
    const id = await createDocument(company.id, 'Reembolsos', 'No hacemos reembolsos después de siete días.');
    await knowledge().ingestService.execute();

    await expectRedirect(
      updateKnowledgeDocumentStatusAction(company.id, id, 'inactive'),
      `/${company.id}/bot/knowledge`,
    );

    const matches = await knowledge().retrieveService.execute(
      new RetrieveKnowledgeCommand(company.id, 'reembolsos', 5, 0),
    );
    expect(matches).toEqual([]);
    // Deactivated, not deleted: the row and its chunks are still there.
    expect(await db.select().from(knowledgeDocuments).where(eq(knowledgeDocuments.id, id))).toHaveLength(1);
    expect((await db.select().from(knowledgeChunks).where(eq(knowledgeChunks.documentId, id))).length).toBeGreaterThan(0);
  });

  it('re-queues the document when its content changes, and replaces its chunks', async () => {
    const { user, company } = await createUserWithCompany(db);
    setSessionUser(user);
    const id = await createDocument(company.id, 'Precios', 'Netflix cuesta tres dólares.');
    await knowledge().ingestService.execute();
    const [indexed] = await db.select().from(knowledgeDocuments).where(eq(knowledgeDocuments.id, id));

    await expectRedirect(
      updateKnowledgeDocumentAction(
        company.id,
        id,
        initialActionState,
        formData({ title: 'Precios', content: 'Netflix cuesta cuatro dólares.' }),
      ),
      `/${company.id}/bot/knowledge/${id}`,
    );

    const [afterEdit] = await db.select().from(knowledgeDocuments).where(eq(knowledgeDocuments.id, id));
    expect(afterEdit.ingestStatus).toBe('pending');
    expect(afterEdit.contentHash).not.toBe(indexed.contentHash);

    await knowledge().ingestService.execute();
    const chunks = await db.select().from(knowledgeChunks).where(eq(knowledgeChunks.documentId, id));
    expect(chunks).toHaveLength(1);
    expect(chunks[0].content).toContain('cuatro');
  });

  it('does not re-queue when only the title changes', async () => {
    const { user, company } = await createUserWithCompany(db);
    setSessionUser(user);
    const id = await createDocument(company.id, 'Precios', 'Netflix cuesta tres dólares.');
    await knowledge().ingestService.execute();

    await expectRedirect(
      updateKnowledgeDocumentAction(
        company.id,
        id,
        initialActionState,
        formData({ title: 'Tarifas', content: 'Netflix cuesta tres dólares.' }),
      ),
      `/${company.id}/bot/knowledge/${id}`,
    );

    const [row] = await db.select().from(knowledgeDocuments).where(eq(knowledgeDocuments.id, id));
    expect(row).toMatchObject({ title: 'Tarifas', ingestStatus: 'indexed' });
  });

  it('re-indexes on demand', async () => {
    const { user, company } = await createUserWithCompany(db);
    setSessionUser(user);
    const id = await createDocument(company.id, 'Precios', 'Netflix cuesta tres dólares.');
    await knowledge().ingestService.execute();

    await expectRedirect(
      reingestKnowledgeDocumentAction(company.id, id),
      `/${company.id}/bot/knowledge/${id}`,
    );

    const [queued] = await db.select().from(knowledgeDocuments).where(eq(knowledgeDocuments.id, id));
    expect(queued.ingestStatus).toBe('pending');
    expect(await knowledge().ingestService.execute()).toEqual({ claimed: 1, indexed: 1, failed: 0 });
  });

  it('cannot reach a document of another company', async () => {
    const a = await createUserWithCompany(db);
    const b = await createUserWithCompany(db);
    setSessionUser(a.user);
    const id = await createDocument(a.company.id, 'Precios', 'Netflix cuesta tres dólares.');

    setSessionUser(b.user);
    const state = await updateKnowledgeDocumentAction(
      b.company.id,
      id,
      initialActionState,
      formData({ title: 'Robado', content: 'Contenido ajeno.' }),
    );

    expect(state.status).toBe('error');
    const [row] = await db.select().from(knowledgeDocuments).where(eq(knowledgeDocuments.id, id));
    expect(row.title).toBe('Precios');
  });
});
