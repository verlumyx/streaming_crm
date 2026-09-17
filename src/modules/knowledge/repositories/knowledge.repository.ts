import type { KnowledgeDocumentRow, KnowledgeDocumentStatus } from '../models/knowledge.model';
import type { CreateKnowledgeDocumentCommand } from '../commands/create-knowledge-document.command';
import type { UpdateKnowledgeDocumentCommand } from '../commands/update-knowledge-document.command';
import type { SearchKnowledgeDocumentCommand } from '../commands/search-knowledge-document.command';

/** A chunk ready to be stored: the text plus the vector that was computed outside the transaction. */
export type KnowledgeChunkData = {
  chunkIndex: number;
  content: string;
  tokenEstimate: number;
  embedding: number[];
};

export type KnowledgeMatch = {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  content: string;
  /** Cosine similarity in [0, 1]; 1 is identical. */
  similarity: number;
};

/** What the ingest worker needs to embed a document, without loading every column. */
export type KnowledgeIngestJob = { id: string; companyId: string; content: string };

export interface KnowledgeRepository {
  create(command: CreateKnowledgeDocumentCommand, contentHash: string): Promise<void>;
  findById(id: string, companyId: string): Promise<KnowledgeDocumentRow | null>;
  findOrFail(id: string, companyId: string): Promise<KnowledgeDocumentRow>;
  search(command: SearchKnowledgeDocumentCommand): Promise<{ data: KnowledgeDocumentRow[]; total: number }>;

  /** Editing the content resets the ingest state; editing only the title does not re-embed. */
  update(row: KnowledgeDocumentRow, command: UpdateKnowledgeDocumentCommand, contentHash: string): Promise<void>;
  updateStatus(row: KnowledgeDocumentRow, status: KnowledgeDocumentStatus): Promise<void>;
  /** Forces a re-embed even when the content did not change (e.g. the model was switched). */
  markForReingest(row: KnowledgeDocumentRow): Promise<void>;

  /** `FOR UPDATE SKIP LOCKED`: several workers can drain the ingest backlog at once. */
  claimPendingIngest(limit: number): Promise<KnowledgeIngestJob[]>;
  /**
   * Replaces the document's chunks with the new ones and marks it indexed. Chunks are a derived
   * index, so this deletes the previous ones — the source of truth is `content`, never deleted.
   */
  replaceChunks(
    documentId: string,
    companyId: string,
    chunks: KnowledgeChunkData[],
    meta: { embeddingModel: string; embeddingDimensions: number },
  ): Promise<void>;
  markIngestFailed(documentId: string, error: string): Promise<void>;

  /** Nearest chunks of ACTIVE documents of this company, ordered by cosine distance. */
  searchSimilar(companyId: string, embedding: number[], limit: number): Promise<KnowledgeMatch[]>;
}
