import { eq, ilike } from 'drizzle-orm';
import { contains, type FilterMap } from '@/modules/shared/infrastructure/drizzle-query-filters';
import {
  knowledgeDocuments,
  type KnowledgeDocumentStatus,
  type KnowledgeIngestStatus,
} from '../models/knowledge.model';

/** Keys MUST match `SearchKnowledgeDocumentCommand.filters`. Filters combine with AND. */
export const knowledgeDocumentFilters = {
  title: (value) => ilike(knowledgeDocuments.title, contains(value)),
  code: (value) => ilike(knowledgeDocuments.code, contains(value)),
  status: (value) => eq(knowledgeDocuments.status, value as KnowledgeDocumentStatus),
  ingestStatus: (value) => eq(knowledgeDocuments.ingestStatus, value as KnowledgeIngestStatus),
} satisfies FilterMap;
