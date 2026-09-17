import { NotFoundError } from '@/modules/shared/exceptions/domain-error';

export class KnowledgeDocumentNotFoundException extends NotFoundError {
  constructor() {
    super('El documento no existe.');
    this.name = 'KnowledgeDocumentNotFoundException';
  }
}
