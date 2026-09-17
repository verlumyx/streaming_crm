import type { CreateKnowledgeDocumentInput } from '../validation/create-knowledge-document.schema';

export class CreateKnowledgeDocumentCommand {
  constructor(
    readonly id: string,
    readonly companyId: string,
    readonly createdBy: string | null,
    readonly title: string,
    readonly content: string,
  ) {}

  static fromInput(
    input: CreateKnowledgeDocumentInput,
    companyId: string,
    createdBy: string | null,
  ): CreateKnowledgeDocumentCommand {
    return new CreateKnowledgeDocumentCommand(input.id, companyId, createdBy, input.title, input.content);
  }
}
