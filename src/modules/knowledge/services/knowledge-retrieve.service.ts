import type { EmbeddingModel } from '@/modules/bot/infrastructure/ai-ports';
import type { KnowledgeMatch, KnowledgeRepository } from '../repositories/knowledge.repository';
import type { RetrieveKnowledgeCommand } from '../commands/retrieve-knowledge.command';

/** Over-fetch so the score threshold still leaves `topK` candidates when a few are weak. */
const OVERFETCH = 2;

/**
 * RAG retrieval. The threshold is applied here rather than in SQL on purpose: a `WHERE` on the
 * computed similarity stops Postgres from using the HNSW index, and filtering a handful of rows
 * in memory is free by comparison.
 */
export class KnowledgeRetrieveService {
  constructor(
    private readonly repository: KnowledgeRepository,
    private readonly embeddings: EmbeddingModel,
  ) {}

  async execute(command: RetrieveKnowledgeCommand): Promise<KnowledgeMatch[]> {
    if (command.query.trim() === '') return [];

    const embedding = await this.embeddings.embedQuery(command.query);
    const candidates = await this.repository.searchSimilar(
      command.companyId,
      embedding,
      command.topK * OVERFETCH,
      this.embeddings.model,
    );

    return candidates.filter((match) => match.similarity >= command.minScore).slice(0, command.topK);
  }
}
