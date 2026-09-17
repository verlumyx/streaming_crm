import { z } from 'zod';
import { requiredText } from '@/modules/shared/validation/fields';

/** Actualizar. Also the base of the create schema. */
export const updateKnowledgeDocumentSchema = z.object({
  title: requiredText('El título', 200),
  content: requiredText('El contenido', 50_000),
});

export type UpdateKnowledgeDocumentInput = z.infer<typeof updateKnowledgeDocumentSchema>;
