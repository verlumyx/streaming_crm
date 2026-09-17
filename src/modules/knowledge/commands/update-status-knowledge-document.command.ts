import type { KnowledgeDocumentStatus } from '../models/knowledge.model';
import type { UpdateStatusKnowledgeDocumentInput } from '../validation/update-status-knowledge-document.schema';

export class UpdateStatusKnowledgeDocumentCommand {
  constructor(readonly status: KnowledgeDocumentStatus) {}

  static fromInput(input: UpdateStatusKnowledgeDocumentInput): UpdateStatusKnowledgeDocumentCommand {
    return new UpdateStatusKnowledgeDocumentCommand(input.status);
  }
}
