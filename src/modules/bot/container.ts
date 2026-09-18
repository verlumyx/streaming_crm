import 'server-only';
import type { DbExecutor } from '@/modules/shared/infrastructure/db-executor';
import { createConversationContainer } from '@/modules/conversation/container';
import type { ChatModel, EmbeddingModel } from './infrastructure/ai-ports';
import { chatModel, embeddingModel } from './infrastructure/ai-factory';
import { LiveChannelIdentityResolver } from './infrastructure/channel-identity.resolver';
import { MetaCloudChannelGateway } from './channels/whatsapp/meta-cloud.gateway';
import { TelegramChannelGateway } from './channels/telegram/telegram.gateway';
import type { ChannelGateway } from './channels/channel-gateway';
import { DrizzleBotSettingsRepository } from './repositories/drizzle-bot-settings.repository';
import { DrizzleBotChannelRepository } from './repositories/drizzle-bot-channel.repository';
import { DrizzleBotEventRepository } from './repositories/drizzle-bot-event.repository';
import { BotSetupService } from './services/bot-setup.service';
import { BotSettingsFindService } from './services/bot-settings-find.service';
import { BotSettingsUpdateService } from './services/bot-settings-update.service';
import { BotChannelCreateService, type ChannelIdentityResolver } from './services/bot-channel-create.service';
import { BotChannelUpdateService } from './services/bot-channel-update.service';
import { BotChannelUpdateStatusService } from './services/bot-channel-update-status.service';
import { BotChannelListService } from './services/bot-channel-list.service';
import { BotChannelFindService } from './services/bot-channel-find.service';
import { BotEventEnqueueService } from './services/bot-event-enqueue.service';
import { BotProcessEventService } from './services/bot-process-event.service';
import { BotQueueDrainService } from './services/bot-queue-drain.service';
import { BotStaleSalesService } from './services/bot-stale-sales.service';
import { createSaleContainer } from '@/modules/sale/container';

/** How many events one `after()` kick drains. The worker uses a larger batch. */
const INLINE_BATCH_SIZE = 3;

export type BotContainerOptions = {
  /** Injected by tests so nothing ever reaches Google, Meta or Telegram. */
  chat?: ChatModel;
  embeddings?: EmbeddingModel;
  identity?: ChannelIdentityResolver;
  gatewayFor?: (channel: { provider: string; externalId: string }) => ChannelGateway;
};

/** The gateway that speaks a given channel's protocol. */
export function gatewayFor(channel: { provider: string; externalId: string }): ChannelGateway {
  return channel.provider === 'telegram' ? new TelegramChannelGateway(channel.externalId) : new MetaCloudChannelGateway();
}

/** Per-request DI: pass `db` from pages and `tx` from actions. */
export function createBotContainer(db: DbExecutor, options: BotContainerOptions = {}) {
  const settingsRepository = new DrizzleBotSettingsRepository(db);
  const channelRepository = new DrizzleBotChannelRepository(db);
  const eventRepository = new DrizzleBotEventRepository(db);
  const conversations = createConversationContainer(db);

  // Each mutating tool gets its own transaction (a savepoint when `db` already is one).
  const runInTransaction = <T,>(work: (tx: DbExecutor) => Promise<T>) => db.transaction((tx) => work(tx));

  const processor = () =>
    new BotProcessEventService({
      db,
      chat: options.chat ?? chatModel(),
      embeddings: options.embeddings ?? embeddingModel(),
      settingsRepository,
      channelRepository,
      gatewayFor: options.gatewayFor ?? gatewayFor,
      runInTransaction,
    });

  return {
    settingsRepository,
    channelRepository,
    eventRepository,

    setupService: new BotSetupService(settingsRepository),
    settingsFindService: new BotSettingsFindService(settingsRepository),
    settingsUpdateService: new BotSettingsUpdateService(settingsRepository),

    channelCreateService: new BotChannelCreateService(
      channelRepository,
      options.identity ?? new LiveChannelIdentityResolver(),
    ),
    channelUpdateService: new BotChannelUpdateService(channelRepository),
    channelUpdateStatusService: new BotChannelUpdateStatusService(channelRepository),
    channelListService: new BotChannelListService(channelRepository),
    channelFindService: new BotChannelFindService(channelRepository),

    eventEnqueueService: new BotEventEnqueueService(eventRepository),
    /** Frees the inventory held by pending sales of the bot that nobody paid for. */
    get staleSalesService() {
      const sales = createSaleContainer(db);
      return new BotStaleSalesService(sales.repository, sales.rejectService);
    },
    messageStatusService: conversations.messageStatusService,

    get processEventService() {
      return processor();
    },
    drainService(batchSize = INLINE_BATCH_SIZE) {
      return new BotQueueDrainService(eventRepository, processor()).execute(batchSize);
    },
    /**
     * Fire-and-forget drain for `after()`: a failure here must never turn the webhook's 200 into a
     * 500, because the event is already safely persisted and the worker will pick it up.
     */
    async drainQueue(): Promise<void> {
      try {
        await new BotQueueDrainService(eventRepository, processor()).execute(INLINE_BATCH_SIZE);
      } catch (error) {
        console.error('[bot-webhook] drenaje en segundo plano falló', error);
      }
    },
  };
}
