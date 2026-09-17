import type { DbExecutor } from '@/modules/shared/infrastructure/db-executor';
import type { EmbeddingModel } from '@/modules/bot/infrastructure/ai-ports';
import { DrizzleKnowledgeRepository } from './repositories/drizzle-knowledge.repository';
import { KnowledgeCreateService } from './services/knowledge-create.service';
import { KnowledgeUpdateService } from './services/knowledge-update.service';
import { KnowledgeUpdateStatusService } from './services/knowledge-update-status.service';
import { KnowledgeFindService } from './services/knowledge-find.service';
import { KnowledgeSearchService } from './services/knowledge-search.service';
import { KnowledgeReingestService } from './services/knowledge-reingest.service';
import { KnowledgeIngestService } from './services/knowledge-ingest.service';
import { KnowledgeRetrieveService } from './services/knowledge-retrieve.service';

/**
 * Per-request DI. `embeddings` is a port, so tests inject a deterministic fake and no test ever
 * reaches Google. It is optional because the CRUD half of the module does not need a model.
 */
export function createKnowledgeContainer(db: DbExecutor, embeddings?: EmbeddingModel) {
  const repository = new DrizzleKnowledgeRepository(db);

  return {
    repository,
    createService: new KnowledgeCreateService(repository),
    updateService: new KnowledgeUpdateService(repository),
    updateStatusService: new KnowledgeUpdateStatusService(repository),
    findService: new KnowledgeFindService(repository),
    searchService: new KnowledgeSearchService(repository),
    reingestService: new KnowledgeReingestService(repository),
    get ingestService() {
      return new KnowledgeIngestService(repository, requireEmbeddings(embeddings));
    },
    get retrieveService() {
      return new KnowledgeRetrieveService(repository, requireEmbeddings(embeddings));
    },
  };
}

function requireEmbeddings(embeddings: EmbeddingModel | undefined): EmbeddingModel {
  if (!embeddings) throw new Error('createKnowledgeContainer requires an EmbeddingModel for this service.');
  return embeddings;
}
