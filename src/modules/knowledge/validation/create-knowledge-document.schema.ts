import { requiredUuid } from '@/modules/shared/validation/fields';
import { updateKnowledgeDocumentSchema } from './update-knowledge-document.schema';

/** Crear = actualizar + el id que genera el cliente. */
export const createKnowledgeDocumentSchema = updateKnowledgeDocumentSchema.extend({ id: requiredUuid() });

export type CreateKnowledgeDocumentInput = typeof createKnowledgeDocumentSchema._output;
