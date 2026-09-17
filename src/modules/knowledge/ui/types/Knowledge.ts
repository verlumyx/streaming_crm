import type { KnowledgeDocumentStatus, KnowledgeIngestStatus } from '@/modules/knowledge/models/knowledge.model';

/** Query-string filters of the list (entity type is `KnowledgeDocumentDto` from the serializer). */
export type KnowledgeFilters = {
  title?: string;
  code?: string;
  status?: KnowledgeDocumentStatus;
  ingestStatus?: KnowledgeIngestStatus;
};

export type KnowledgeMeta = {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
};
