import type { KnowledgeDocumentRow } from '../models/knowledge.model';
import type { KnowledgeRepository } from '../repositories/knowledge.repository';
import type { SearchKnowledgeDocumentCommand } from '../commands/search-knowledge-document.command';

export class KnowledgeSearchService {
  constructor(private readonly repository: KnowledgeRepository) {}

  async execute(command: SearchKnowledgeDocumentCommand): Promise<{ data: KnowledgeDocumentRow[]; total: number }> {
    return this.repository.search(command);
  }
}
