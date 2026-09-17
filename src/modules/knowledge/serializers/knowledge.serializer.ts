import type {
  KnowledgeDocumentRow,
  KnowledgeDocumentStatus,
  KnowledgeIngestStatus,
} from '../models/knowledge.model';

export type KnowledgeDocumentDto = {
  id: string;
  code: string;
  title: string;
  content: string;
  status: KnowledgeDocumentStatus;
  ingestStatus: KnowledgeIngestStatus;
  ingestError: string | null;
  chunkCount: number;
  indexedAt: string | null;
  embeddingModel: string | null;
  createdAt: string;
  updatedAt: string | null;
};

export function toKnowledgeDocumentDto(row: KnowledgeDocumentRow): KnowledgeDocumentDto {
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    content: row.content,
    status: row.status,
    ingestStatus: row.ingestStatus,
    ingestError: row.ingestError,
    chunkCount: row.chunkCount,
    indexedAt: row.indexedAt?.toISOString() ?? null,
    embeddingModel: row.embeddingModel,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt?.toISOString() ?? null,
  };
}
