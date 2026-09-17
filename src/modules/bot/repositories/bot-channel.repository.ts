import type { BotChannelRow, BotChannelStatus, BotProvider } from '../models/bot-channel.model';
import type { CreateBotChannelCommand } from '../commands/create-bot-channel.command';
import type { UpdateBotChannelCommand } from '../commands/update-bot-channel.command';

/** A channel plus its decrypted secrets. Never crosses the server boundary. */
export type BotChannelWithCredentials = {
  row: BotChannelRow;
  credentials: {
    externalId: string;
    accessToken: string;
    appSecret: string | null;
    verifyToken: string | null;
    webhookSecret: string | null;
    apiVersion: string;
  };
};

export interface BotChannelRepository {
  create(command: CreateBotChannelCommand): Promise<void>;
  findById(id: string, companyId: string): Promise<BotChannelRow | null>;
  findOrFail(id: string, companyId: string): Promise<BotChannelRow>;
  listByCompany(companyId: string): Promise<BotChannelRow[]>;
  update(row: BotChannelRow, command: UpdateBotChannelCommand): Promise<void>;
  updateStatus(row: BotChannelRow, status: BotChannelStatus): Promise<void>;
  /** Same provider + external id in another company: the webhook would be ambiguous. */
  existsByExternalId(provider: BotProvider, externalId: string, ignoreId?: string): Promise<boolean>;

  /**
   * Webhook entry point: resolves an ACTIVE channel by its public id and decrypts its secrets.
   * Deliberately not scoped by company — the channel is what tells us which company this is.
   */
  findActiveWithCredentials(id: string): Promise<BotChannelWithCredentials | null>;
  /** Used by the worker to reply through the same channel the message arrived on. */
  findWithCredentials(id: string): Promise<BotChannelWithCredentials | null>;

  touch(id: string, error: string | null): Promise<void>;
}
