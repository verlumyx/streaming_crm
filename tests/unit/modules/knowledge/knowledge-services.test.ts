import { describe, expect, it } from 'vitest';
import { KnowledgeCreateService } from '@/modules/knowledge/services/knowledge-create.service';
import { KnowledgeUpdateService } from '@/modules/knowledge/services/knowledge-update.service';
import { KnowledgeUpdateStatusService } from '@/modules/knowledge/services/knowledge-update-status.service';
import { KnowledgeReingestService } from '@/modules/knowledge/services/knowledge-reingest.service';
import { KnowledgeIngestService } from '@/modules/knowledge/services/knowledge-ingest.service';
import { KnowledgeRetrieveService } from '@/modules/knowledge/services/knowledge-retrieve.service';
import { CreateKnowledgeDocumentCommand } from '@/modules/knowledge/commands/create-knowledge-document.command';
import { UpdateKnowledgeDocumentCommand } from '@/modules/knowledge/commands/update-knowledge-document.command';
import { UpdateStatusKnowledgeDocumentCommand } from '@/modules/knowledge/commands/update-status-knowledge-document.command';
import { RetrieveKnowledgeCommand } from '@/modules/knowledge/commands/retrieve-knowledge.command';
import { KnowledgeDocumentNotFoundException } from '@/modules/knowledge/exceptions/knowledge-document-not-found.exception';
import { uuidv7 } from '@/modules/shared/uuid';
import { FakeKnowledgeRepository } from './fake-knowledge.repository';
import { FakeEmbeddingModel } from '../bot/fake-ai';

const COMPANY = '0192f3a0-0000-7000-8000-00000000c001';
const OTHER_COMPANY = '0192f3a0-0000-7000-8000-00000000c002';

const newDocument = (companyId: string, title: string, content: string) =>
  new CreateKnowledgeDocumentCommand(uuidv7(), companyId, null, title, content);

async function seedIndexed(repository: FakeKnowledgeRepository, embeddings: FakeEmbeddingModel, docs: [string, string][]) {
  for (const [title, content] of docs) {
    await new KnowledgeCreateService(repository).execute(newDocument(COMPANY, title, content));
  }
  await new KnowledgeIngestService(repository, embeddings).execute(docs.length);
}

describe('KnowledgeCreateService', () => {
  it('stores the document pending, with a sequential code per company', async () => {
    const repository = new FakeKnowledgeRepository();
    const service = new KnowledgeCreateService(repository);

    const first = await service.execute(newDocument(COMPANY, 'Políticas', 'No hay reembolsos tras 7 días.'));
    const second = await service.execute(newDocument(COMPANY, 'Precios', 'Netflix 3 USD.'));
    const otherCompany = await service.execute(newDocument(OTHER_COMPANY, 'Otra', 'Contenido.'));

    expect(first).toMatchObject({ code: 'DOC000001', status: 'active', ingestStatus: 'pending', chunkCount: 0 });
    expect(second.code).toBe('DOC000002');
    // Each company has its own sequence.
    expect(otherCompany.code).toBe('DOC000001');
  });
});

describe('KnowledgeUpdateService', () => {
  it('re-queues the document when the content changes', async () => {
    const repository = new FakeKnowledgeRepository();
    const embeddings = new FakeEmbeddingModel();
    const created = await new KnowledgeCreateService(repository).execute(newDocument(COMPANY, 'Precios', 'Netflix 3 USD.'));
    await new KnowledgeIngestService(repository, embeddings).execute();
    expect((await repository.findOrFail(created.id, COMPANY)).ingestStatus).toBe('indexed');

    const updated = await new KnowledgeUpdateService(repository).execute(
      created.id,
      COMPANY,
      new UpdateKnowledgeDocumentCommand('Precios', 'Netflix 4 USD.'),
    );

    expect(updated.ingestStatus).toBe('pending');
  });

  it('does not re-embed when only the title changes', async () => {
    const repository = new FakeKnowledgeRepository();
    const embeddings = new FakeEmbeddingModel();
    const created = await new KnowledgeCreateService(repository).execute(newDocument(COMPANY, 'Precios', 'Netflix 3 USD.'));
    await new KnowledgeIngestService(repository, embeddings).execute();

    const updated = await new KnowledgeUpdateService(repository).execute(
      created.id,
      COMPANY,
      new UpdateKnowledgeDocumentCommand('Tarifas', 'Netflix 3 USD.'),
    );

    expect(updated).toMatchObject({ title: 'Tarifas', ingestStatus: 'indexed' });
  });

  it('cannot reach a document of another company', async () => {
    const repository = new FakeKnowledgeRepository();
    const created = await new KnowledgeCreateService(repository).execute(newDocument(COMPANY, 'Precios', 'Netflix.'));

    await expect(
      new KnowledgeUpdateService(repository).execute(
        created.id,
        OTHER_COMPANY,
        new UpdateKnowledgeDocumentCommand('Hackeado', 'Contenido ajeno.'),
      ),
    ).rejects.toBeInstanceOf(KnowledgeDocumentNotFoundException);
  });
});

describe('KnowledgeIngestService', () => {
  it('splits, embeds and indexes a pending document', async () => {
    const repository = new FakeKnowledgeRepository();
    const embeddings = new FakeEmbeddingModel();
    const created = await new KnowledgeCreateService(repository).execute(
      newDocument(COMPANY, 'Políticas', 'Párrafo uno.\n\nPárrafo dos.'),
    );

    const report = await new KnowledgeIngestService(repository, embeddings).execute();

    expect(report).toEqual({ claimed: 1, indexed: 1, failed: 0 });
    const indexed = await repository.findOrFail(created.id, COMPANY);
    expect(indexed).toMatchObject({ ingestStatus: 'indexed', embeddingModel: 'fake-embedding', embeddingDimensions: 768 });
    expect(indexed.chunkCount).toBeGreaterThan(0);
    expect(repository.chunks.every((c) => c.embedding.length === 768)).toBe(true);
  });

  it('does nothing on a second run: indexed documents are not re-embedded', async () => {
    const repository = new FakeKnowledgeRepository();
    const embeddings = new FakeEmbeddingModel();
    await new KnowledgeCreateService(repository).execute(newDocument(COMPANY, 'Políticas', 'Contenido.'));
    const service = new KnowledgeIngestService(repository, embeddings);

    await service.execute();
    const callsAfterFirst = embeddings.calls.length;
    const second = await service.execute();

    expect(second).toEqual({ claimed: 0, indexed: 0, failed: 0 });
    expect(embeddings.calls).toHaveLength(callsAfterFirst);
  });

  it('records the failure on the document and keeps going with the batch', async () => {
    const repository = new FakeKnowledgeRepository();
    const embeddings = new FakeEmbeddingModel();
    const created = await new KnowledgeCreateService(repository).execute(newDocument(COMPANY, 'Políticas', 'Contenido.'));
    repository.failOnReplace = 'cuota agotada';

    const report = await new KnowledgeIngestService(repository, embeddings).execute();

    expect(report).toEqual({ claimed: 1, indexed: 0, failed: 1 });
    expect(await repository.findOrFail(created.id, COMPANY)).toMatchObject({
      ingestStatus: 'failed',
      ingestError: 'cuota agotada',
    });
  });

  it('re-indexes a document queued again', async () => {
    const repository = new FakeKnowledgeRepository();
    const embeddings = new FakeEmbeddingModel();
    const created = await new KnowledgeCreateService(repository).execute(newDocument(COMPANY, 'Políticas', 'Contenido.'));
    const service = new KnowledgeIngestService(repository, embeddings);
    await service.execute();

    await new KnowledgeReingestService(repository).execute(created.id, COMPANY);
    const report = await service.execute();

    expect(report).toEqual({ claimed: 1, indexed: 1, failed: 0 });
    // Chunks are replaced, never duplicated.
    expect(repository.chunks.filter((c) => c.documentId === created.id)).toHaveLength(1);
  });
});

describe('KnowledgeRetrieveService', () => {
  it('returns the most similar chunk first', async () => {
    const repository = new FakeKnowledgeRepository();
    const embeddings = new FakeEmbeddingModel();
    await seedIndexed(repository, embeddings, [
      ['Reembolsos', 'No hacemos reembolsos después de siete días.'],
      ['Horario', 'Atendemos de lunes a viernes.'],
    ]);

    const matches = await new KnowledgeRetrieveService(repository, embeddings).execute(
      new RetrieveKnowledgeCommand(COMPANY, 'reembolsos después de siete días', 5, 0),
    );

    expect(matches[0].documentTitle).toBe('Reembolsos');
  });

  it('drops matches below the minimum score', async () => {
    const repository = new FakeKnowledgeRepository();
    const embeddings = new FakeEmbeddingModel();
    await seedIndexed(repository, embeddings, [['Horario', 'Atendemos de lunes a viernes.']]);

    const matches = await new KnowledgeRetrieveService(repository, embeddings).execute(
      new RetrieveKnowledgeCommand(COMPANY, 'zzz contenido totalmente distinto qwerty', 5, 0.9),
    );

    expect(matches).toEqual([]);
  });

  it('never returns another company knowledge', async () => {
    const repository = new FakeKnowledgeRepository();
    const embeddings = new FakeEmbeddingModel();
    await seedIndexed(repository, embeddings, [['Reembolsos', 'No hacemos reembolsos después de siete días.']]);
    await new KnowledgeCreateService(repository).execute(
      newDocument(OTHER_COMPANY, 'Reembolsos', 'No hacemos reembolsos después de siete días.'),
    );
    await new KnowledgeIngestService(repository, embeddings).execute();

    const matches = await new KnowledgeRetrieveService(repository, embeddings).execute(
      new RetrieveKnowledgeCommand(OTHER_COMPANY, 'reembolsos', 5, 0),
    );

    expect(matches.every((m) => repository.rows.find((r) => r.id === m.documentId)!.companyId === OTHER_COMPANY)).toBe(
      true,
    );
  });

  it('ignores deactivated documents', async () => {
    const repository = new FakeKnowledgeRepository();
    const embeddings = new FakeEmbeddingModel();
    await seedIndexed(repository, embeddings, [['Reembolsos', 'No hacemos reembolsos después de siete días.']]);
    await new KnowledgeUpdateStatusService(repository).execute(
      repository.rows[0].id,
      COMPANY,
      new UpdateStatusKnowledgeDocumentCommand('inactive'),
    );

    const matches = await new KnowledgeRetrieveService(repository, embeddings).execute(
      new RetrieveKnowledgeCommand(COMPANY, 'reembolsos', 5, 0),
    );

    expect(matches).toEqual([]);
  });

  it('does not call the model for an empty query', async () => {
    const repository = new FakeKnowledgeRepository();
    const embeddings = new FakeEmbeddingModel();

    const matches = await new KnowledgeRetrieveService(repository, embeddings).execute(
      new RetrieveKnowledgeCommand(COMPANY, '   ', 5, 0),
    );

    expect(matches).toEqual([]);
    expect(embeddings.calls).toEqual([]);
  });
});
