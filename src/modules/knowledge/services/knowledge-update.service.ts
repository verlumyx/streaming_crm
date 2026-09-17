import type { KnowledgeDocumentRow } from '../models/knowledge.model';
import type { KnowledgeRepository } from '../repositories/knowledge.repository';
import type { UpdateKnowledgeDocumentCommand } from '../commands/update-knowledge-document.command';
import { hashContent } from '../domain/content-hash';

export class KnowledgeUpdateService {
  constructor(private readonly repository: KnowledgeRepository) {}

  async execute(id: string, companyId: string, command: UpdateKnowledgeDocumentCommand): Promise<KnowledgeDocumentRow> {
    const row = await this.repository.findOrFail(id, companyId);
    await this.repository.update(row, command, hashContent(command.content));
    return this.repository.findOrFail(id, companyId);
  }
}
