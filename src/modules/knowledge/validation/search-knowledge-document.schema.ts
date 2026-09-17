import { z } from 'zod';
import { limitParam, offsetParam, optionalEnumFilter, optionalFilter } from '@/modules/shared/validation/fields';
import { KNOWLEDGE_DOCUMENT_STATUSES, KNOWLEDGE_INGEST_STATUSES } from '../models/knowledge.model';

/** Listar. Never throws: an unusable query param is ignored, not an error page. */
export const searchKnowledgeDocumentSchema = z.object({
  title: optionalFilter,
  code: optionalFilter,
  status: optionalEnumFilter(KNOWLEDGE_DOCUMENT_STATUSES),
  ingestStatus: optionalEnumFilter(KNOWLEDGE_INGEST_STATUSES),
  limit: limitParam(),
  offset: offsetParam(),
});

export type SearchKnowledgeDocumentInput = z.infer<typeof searchKnowledgeDocumentSchema>;
