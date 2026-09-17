import type { KnowledgeDocumentRow } from '../models/knowledge.model';
import type { KnowledgeRepository } from '../repositories/knowledge.repository';

export class KnowledgeFindService {
  constructor(private readonly repository: KnowledgeRepository) {}

  async execute(id: string, companyId: string): Promise<KnowledgeDocumentRow> {
    return this.repository.findOrFail(id, companyId);
  }
}
