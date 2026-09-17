import type { DbExecutor } from '@/modules/shared/infrastructure/db-executor';
import { DrizzleConversationRepository } from './repositories/drizzle-conversation.repository';
import { ConversationResolveService } from './services/conversation-resolve.service';
import { ConversationHandoffService } from './services/conversation-handoff.service';
import { ConversationSearchService } from './services/conversation-search.service';
import { ConversationFindService } from './services/conversation-find.service';
import { BotMessageStatusService } from './services/bot-message-status.service';

/** Per-request DI: pass `db` from pages and `tx` from actions. */
export function createConversationContainer(db: DbExecutor) {
  const repository = new DrizzleConversationRepository(db);

  return {
    repository,
    resolveService: new ConversationResolveService(repository),
    handoffService: new ConversationHandoffService(repository),
    searchService: new ConversationSearchService(repository),
    findService: new ConversationFindService(repository),
    messageStatusService: new BotMessageStatusService(repository),
  };
}
