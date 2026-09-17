import type { KnowledgeDocumentRow } from '../models/knowledge.model';
import type { KnowledgeRepository } from '../repositories/knowledge.repository';
import type { CreateKnowledgeDocumentCommand } from '../commands/create-knowledge-document.command';
import { hashContent } from '../domain/content-hash';

/** Crear. The document starts `pending`: the worker embeds it, never the request. */
export class KnowledgeCreateService {
  constructor(private readonly repository: KnowledgeRepository) {}

  async execute(command: CreateKnowledgeDocumentCommand): Promise<KnowledgeDocumentRow> {
    await this.repository.create(command, hashContent(command.content));
    return this.repository.findOrFail(command.id, command.companyId);
  }
}
