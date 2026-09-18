import 'server-only';
import { and, asc, cosineDistance, count, desc, eq, sql } from 'drizzle-orm';
import type { DbExecutor } from '@/modules/shared/infrastructure/db-executor';
import { applyFilters } from '@/modules/shared/infrastructure/drizzle-query-filters';
import { generateNextCode, lockCompanySequence } from '@/modules/shared/infrastructure/sequential-code';
import {
  knowledgeChunks,
  knowledgeDocuments,
  KNOWLEDGE_CODE_PREFIX,
  type KnowledgeDocumentRow,
  type KnowledgeDocumentStatus,
} from '../models/knowledge.model';
import type { CreateKnowledgeDocumentCommand } from '../commands/create-knowledge-document.command';
import type { UpdateKnowledgeDocumentCommand } from '../commands/update-knowledge-document.command';
import type { SearchKnowledgeDocumentCommand } from '../commands/search-knowledge-document.command';
import { KnowledgeDocumentNotFoundException } from '../exceptions/knowledge-document-not-found.exception';
import { knowledgeDocumentFilters } from './knowledge.filters';
import type {
  KnowledgeChunkData,
  KnowledgeIngestJob,
  KnowledgeMatch,
  KnowledgeRepository,
} from './knowledge.repository';
import { uuidv7 } from '@/modules/shared/uuid';

export class DrizzleKnowledgeRepository implements KnowledgeRepository {
  constructor(private readonly db: DbExecutor) {}

  async create(command: CreateKnowledgeDocumentCommand, contentHash: string): Promise<void> {
    await lockCompanySequence(this.db, command.companyId, KNOWLEDGE_CODE_PREFIX);
    const code = await generateNextCode(this.db, knowledgeDocuments, command.companyId, KNOWLEDGE_CODE_PREFIX);

    await this.db.insert(knowledgeDocuments).values({
      id: command.id,
      companyId: command.companyId,
      code,
      title: command.title,
      content: command.content,
      contentHash,
      createdBy: command.createdBy,
    });
  }

  async findById(id: string, companyId: string): Promise<KnowledgeDocumentRow | null> {
    const [row] = await this.db
      .select()
      .from(knowledgeDocuments)
      .where(and(eq(knowledgeDocuments.id, id), eq(knowledgeDocuments.companyId, companyId)))
      .limit(1);
    return row ?? null;
  }

  async findOrFail(id: string, companyId: string): Promise<KnowledgeDocumentRow> {
    const row = await this.findById(id, companyId);
    if (!row) throw new KnowledgeDocumentNotFoundException();
    return row;
  }

  async search(command: SearchKnowledgeDocumentCommand) {
    const where = and(
      eq(knowledgeDocuments.companyId, command.companyId),
      ...applyFilters(knowledgeDocumentFilters, command.filters),
    );

    const [{ total }] = await this.db.select({ total: count() }).from(knowledgeDocuments).where(where);
    const data = await this.db
      .select()
      .from(knowledgeDocuments)
      .where(where)
      .orderBy(desc(knowledgeDocuments.createdAt), desc(knowledgeDocuments.id))
      .limit(command.limit)
      .offset(command.offset);

    return { data, total };
  }

  async update(
    row: KnowledgeDocumentRow,
    command: UpdateKnowledgeDocumentCommand,
    contentHash: string,
  ): Promise<void> {
    const contentChanged = contentHash !== row.contentHash;

    await this.db
      .update(knowledgeDocuments)
      .set({
        title: command.title,
        content: command.content,
        contentHash,
        // Renaming a document does not cost an embedding call; rewriting it does.
        ...(contentChanged ? { ingestStatus: 'pending' as const, ingestError: null } : {}),
      })
      .where(eq(knowledgeDocuments.id, row.id));
  }

  async updateStatus(row: KnowledgeDocumentRow, status: KnowledgeDocumentStatus): Promise<void> {
    await this.db.update(knowledgeDocuments).set({ status }).where(eq(knowledgeDocuments.id, row.id));
  }

  async markForReingest(row: KnowledgeDocumentRow): Promise<void> {
    await this.db
      .update(knowledgeDocuments)
      .set({ ingestStatus: 'pending', ingestError: null })
      .where(eq(knowledgeDocuments.id, row.id));
  }

  async markStaleForReingest(embeddingModel: string): Promise<number> {
    const rows = await this.db
      .update(knowledgeDocuments)
      .set({ ingestStatus: 'pending', ingestError: null })
      .where(
        and(
          eq(knowledgeDocuments.ingestStatus, 'indexed'),
          sql`${knowledgeDocuments.embeddingModel} is distinct from ${embeddingModel}`,
        ),
      )
      .returning({ id: knowledgeDocuments.id });

    return rows.length;
  }

  async claimPendingIngest(limit: number): Promise<KnowledgeIngestJob[]> {
    const rows = await this.db.execute<KnowledgeIngestJob>(sql`
      update ${knowledgeDocuments}
      set ingest_status = 'processing', updated_at = now()
      where id in (
        select id from ${knowledgeDocuments}
        where ingest_status = 'pending' and status = 'active'
        order by created_at
        for update skip locked
        limit ${limit}
      )
      returning id, company_id as "companyId", content
    `);

    return [...rows];
  }

  async replaceChunks(
    documentId: string,
    companyId: string,
    chunks: KnowledgeChunkData[],
    meta: { embeddingModel: string; embeddingDimensions: number },
  ): Promise<void> {
    // Chunks are a derived index: rewriting them wholesale is simpler and cheaper than diffing.
    await this.db.delete(knowledgeChunks).where(eq(knowledgeChunks.documentId, documentId));

    if (chunks.length > 0) {
      await this.db.insert(knowledgeChunks).values(
        chunks.map((chunk) => ({
          id: uuidv7(),
          companyId,
          documentId,
          chunkIndex: chunk.chunkIndex,
          content: chunk.content,
          tokenEstimate: chunk.tokenEstimate,
          embedding: chunk.embedding,
        })),
      );
    }

    await this.db
      .update(knowledgeDocuments)
      .set({
        ingestStatus: 'indexed',
        ingestError: null,
        chunkCount: chunks.length,
        indexedAt: new Date(),
        embeddingModel: meta.embeddingModel,
        embeddingDimensions: meta.embeddingDimensions,
      })
      .where(eq(knowledgeDocuments.id, documentId));
  }

  async markIngestFailed(documentId: string, error: string): Promise<void> {
    await this.db
      .update(knowledgeDocuments)
      .set({ ingestStatus: 'failed', ingestError: error.slice(0, 2000) })
      .where(eq(knowledgeDocuments.id, documentId));
  }

  /**
   * `ORDER BY distance ASC … LIMIT n` is the only shape the HNSW index can serve; ordering by
   * `1 - distance DESC` would silently fall back to a sequential scan. The score threshold is
   * applied by the service afterwards, for the same reason.
   */
  async searchSimilar(
    companyId: string,
    embedding: number[],
    limit: number,
    embeddingModel: string,
  ): Promise<KnowledgeMatch[]> {
    const distance = cosineDistance(knowledgeChunks.embedding, embedding);

    const rows = await this.db
      .select({
        chunkId: knowledgeChunks.id,
        documentId: knowledgeChunks.documentId,
        documentTitle: knowledgeDocuments.title,
        content: knowledgeChunks.content,
        similarity: sql<number>`1 - (${distance})`,
      })
      .from(knowledgeChunks)
      .innerJoin(knowledgeDocuments, eq(knowledgeDocuments.id, knowledgeChunks.documentId))
      .where(
        and(
          eq(knowledgeChunks.companyId, companyId),
          eq(knowledgeDocuments.status, 'active'),
          eq(knowledgeDocuments.embeddingModel, embeddingModel),
        ),
      )
      .orderBy(asc(distance))
      .limit(limit);

    return rows.map((row) => ({ ...row, similarity: Number(row.similarity) }));
  }
}
