import type { KnowledgeDocumentRow } from '../models/knowledge.model';
import type { KnowledgeRepository } from '../repositories/knowledge.repository';

/** Queues a document for re-embedding even though its text did not change (model or dimension switch). */
export class KnowledgeReingestService {
  constructor(private readonly repository: KnowledgeRepository) {}

  async execute(id: string, companyId: string): Promise<KnowledgeDocumentRow> {
    const row = await this.repository.findOrFail(id, companyId);
    await this.repository.markForReingest(row);
    return this.repository.findOrFail(id, companyId);
  }
}
