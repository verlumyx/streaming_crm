import type { KnowledgeDocumentRow, KnowledgeDocumentStatus } from '@/modules/knowledge/models/knowledge.model';
import type {
  KnowledgeChunkData,
  KnowledgeIngestJob,
  KnowledgeMatch,
  KnowledgeRepository,
} from '@/modules/knowledge/repositories/knowledge.repository';
import type { CreateKnowledgeDocumentCommand } from '@/modules/knowledge/commands/create-knowledge-document.command';
import type { UpdateKnowledgeDocumentCommand } from '@/modules/knowledge/commands/update-knowledge-document.command';
import type { SearchKnowledgeDocumentCommand } from '@/modules/knowledge/commands/search-knowledge-document.command';
import { KnowledgeDocumentNotFoundException } from '@/modules/knowledge/exceptions/knowledge-document-not-found.exception';
import { formatSequentialCode } from '@/modules/shared/infrastructure/sequential-code';
import { uuidv7 } from '@/modules/shared/uuid';

type StoredChunk = KnowledgeChunkData & { id: string; companyId: string; documentId: string };

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dot / denominator;
}

/** In-memory `KnowledgeRepository`, including a naive vector search, for service unit tests. */
export class FakeKnowledgeRepository implements KnowledgeRepository {
  rows: KnowledgeDocumentRow[] = [];
  chunks: StoredChunk[] = [];
  /** Set to make `replaceChunks` blow up, to exercise the ingest error path. */
  failOnReplace: string | null = null;

  async create(command: CreateKnowledgeDocumentCommand, contentHash: string): Promise<void> {
    const sequence = this.rows.filter((r) => r.companyId === command.companyId).length + 1;
    this.rows.push({
      id: command.id,
      companyId: command.companyId,
      code: formatSequentialCode('DOC', sequence),
      title: command.title,
      sourceType: 'manual',
      content: command.content,
      contentHash,
      status: 'active',
      ingestStatus: 'pending',
      ingestError: null,
      chunkCount: 0,
      indexedAt: null,
      embeddingModel: null,
      embeddingDimensions: null,
      createdBy: command.createdBy,
      createdAt: new Date(),
      updatedAt: null,
    });
  }

  async findById(id: string, companyId: string) {
    return this.rows.find((r) => r.id === id && r.companyId === companyId) ?? null;
  }

  async findOrFail(id: string, companyId: string) {
    const row = await this.findById(id, companyId);
    if (!row) throw new KnowledgeDocumentNotFoundException();
    return row;
  }

  async search(command: SearchKnowledgeDocumentCommand) {
    const all = this.rows.filter((r) => r.companyId === command.companyId);
    return { data: all.slice(command.offset, command.offset + command.limit), total: all.length };
  }

  async update(row: KnowledgeDocumentRow, command: UpdateKnowledgeDocumentCommand, contentHash: string) {
    const index = this.rows.findIndex((r) => r.id === row.id);
    const contentChanged = contentHash !== row.contentHash;
    this.rows[index] = {
      ...this.rows[index],
      title: command.title,
      content: command.content,
      contentHash,
      ...(contentChanged ? { ingestStatus: 'pending' as const, ingestError: null } : {}),
      updatedAt: new Date(),
    };
  }

  async updateStatus(row: KnowledgeDocumentRow, status: KnowledgeDocumentStatus) {
    const index = this.rows.findIndex((r) => r.id === row.id);
    this.rows[index] = { ...this.rows[index], status };
  }

  async markForReingest(row: KnowledgeDocumentRow) {
    const index = this.rows.findIndex((r) => r.id === row.id);
    this.rows[index] = { ...this.rows[index], ingestStatus: 'pending', ingestError: null };
  }

  async claimPendingIngest(limit: number): Promise<KnowledgeIngestJob[]> {
    const jobs = this.rows.filter((r) => r.ingestStatus === 'pending' && r.status === 'active').slice(0, limit);
    for (const job of jobs) {
      const index = this.rows.findIndex((r) => r.id === job.id);
      this.rows[index] = { ...this.rows[index], ingestStatus: 'processing' };
    }
    return jobs.map((job) => ({ id: job.id, companyId: job.companyId, content: job.content }));
  }

  async replaceChunks(
    documentId: string,
    companyId: string,
    chunks: KnowledgeChunkData[],
    meta: { embeddingModel: string; embeddingDimensions: number },
  ) {
    if (this.failOnReplace) throw new Error(this.failOnReplace);

    this.chunks = this.chunks.filter((c) => c.documentId !== documentId);
    this.chunks.push(...chunks.map((chunk) => ({ ...chunk, id: uuidv7(), companyId, documentId })));

    const index = this.rows.findIndex((r) => r.id === documentId);
    this.rows[index] = {
      ...this.rows[index],
      ingestStatus: 'indexed',
      ingestError: null,
      chunkCount: chunks.length,
      indexedAt: new Date(),
      embeddingModel: meta.embeddingModel,
      embeddingDimensions: meta.embeddingDimensions,
    };
  }

  async markIngestFailed(documentId: string, error: string) {
    const index = this.rows.findIndex((r) => r.id === documentId);
    this.rows[index] = { ...this.rows[index], ingestStatus: 'failed', ingestError: error };
  }

  async searchSimilar(companyId: string, embedding: number[], limit: number): Promise<KnowledgeMatch[]> {
    const activeDocuments = new Set(
      this.rows.filter((r) => r.companyId === companyId && r.status === 'active').map((r) => r.id),
    );

    return this.chunks
      .filter((c) => c.companyId === companyId && activeDocuments.has(c.documentId))
      .map((chunk) => ({
        chunkId: chunk.id,
        documentId: chunk.documentId,
        documentTitle: this.rows.find((r) => r.id === chunk.documentId)!.title,
        content: chunk.content,
        similarity: cosineSimilarity(chunk.embedding, embedding),
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }
}
