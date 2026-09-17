import { z } from 'zod';
import { KNOWLEDGE_DOCUMENT_STATUSES } from '../models/knowledge.model';

export const updateStatusKnowledgeDocumentSchema = z.object({
  status: z.enum(KNOWLEDGE_DOCUMENT_STATUSES, { message: 'El estado no es válido.' }),
});

export type UpdateStatusKnowledgeDocumentInput = z.infer<typeof updateStatusKnowledgeDocumentSchema>;
