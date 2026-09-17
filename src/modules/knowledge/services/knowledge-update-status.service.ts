import type { KnowledgeDocumentRow } from '../models/knowledge.model';
import type { KnowledgeRepository } from '../repositories/knowledge.repository';
import type { UpdateStatusKnowledgeDocumentCommand } from '../commands/update-status-knowledge-document.command';

/** Actualizar Estado. `inactive` takes the document out of retrieval; nothing is ever deleted. */
export class KnowledgeUpdateStatusService {
  constructor(private readonly repository: KnowledgeRepository) {}

  async execute(
    id: string,
    companyId: string,
    command: UpdateStatusKnowledgeDocumentCommand,
  ): Promise<KnowledgeDocumentRow> {
    const row = await this.repository.findOrFail(id, companyId);
    await this.repository.updateStatus(row, command.status);
    return this.repository.findOrFail(id, companyId);
  }
}
