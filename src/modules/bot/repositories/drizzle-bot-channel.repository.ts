import 'server-only';
import { and, asc, eq, ne } from 'drizzle-orm';
import type { DbExecutor } from '@/modules/shared/infrastructure/db-executor';
import { decrypt, encrypt } from '@/modules/shared/crypto';
import {
  botChannels,
  type BotChannelRow,
  type BotChannelStatus,
  type BotProvider,
} from '../models/bot-channel.model';
import type { CreateBotChannelCommand } from '../commands/create-bot-channel.command';
import type { UpdateBotChannelCommand } from '../commands/update-bot-channel.command';
import { BotChannelNotFoundException } from '../exceptions/bot-channel-not-found.exception';
import type { BotChannelRepository, BotChannelWithCredentials } from './bot-channel.repository';

export class DrizzleBotChannelRepository implements BotChannelRepository {
  constructor(private readonly db: DbExecutor) {}

  async create(command: CreateBotChannelCommand): Promise<void> {
    await this.db.insert(botChannels).values({
      id: command.id,
      companyId: command.companyId,
      provider: command.provider,
      externalId: command.externalId,
      displayName: command.displayName,
      accessTokenEncrypted: encrypt(command.accessToken),
      appSecretEncrypted: command.appSecret ? encrypt(command.appSecret) : null,
      verifyTokenEncrypted: command.verifyToken ? encrypt(command.verifyToken) : null,
      webhookSecretEncrypted: command.webhookSecret ? encrypt(command.webhookSecret) : null,
      wabaId: command.wabaId,
      graphApiVersion: command.graphApiVersion,
      status: 'inactive',
    });
  }

  async findById(id: string, companyId: string): Promise<BotChannelRow | null> {
    const [row] = await this.db
      .select()
      .from(botChannels)
      .where(and(eq(botChannels.id, id), eq(botChannels.companyId, companyId)))
      .limit(1);
    return row ?? null;
  }

  async findOrFail(id: string, companyId: string): Promise<BotChannelRow> {
    const row = await this.findById(id, companyId);
    if (!row) throw new BotChannelNotFoundException();
    return row;
  }

  async listByCompany(companyId: string): Promise<BotChannelRow[]> {
    return this.db
      .select()
      .from(botChannels)
      .where(eq(botChannels.companyId, companyId))
      .orderBy(asc(botChannels.provider), asc(botChannels.createdAt));
  }

  async update(row: BotChannelRow, command: UpdateBotChannelCommand): Promise<void> {
    await this.db
      .update(botChannels)
      .set({
        displayName: command.displayName,
        graphApiVersion: command.graphApiVersion,
        wabaId: command.wabaId,
        status: command.status,
        // A null secret means "unchanged": the form never round-trips a token.
        ...(command.accessToken ? { accessTokenEncrypted: encrypt(command.accessToken) } : {}),
        ...(command.appSecret ? { appSecretEncrypted: encrypt(command.appSecret) } : {}),
        ...(command.verifyToken ? { verifyTokenEncrypted: encrypt(command.verifyToken) } : {}),
      })
      .where(eq(botChannels.id, row.id));
  }

  async updateStatus(row: BotChannelRow, status: BotChannelStatus): Promise<void> {
    await this.db.update(botChannels).set({ status }).where(eq(botChannels.id, row.id));
  }

  async existsByExternalId(provider: BotProvider, externalId: string, ignoreId?: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: botChannels.id })
      .from(botChannels)
      .where(
        and(
          eq(botChannels.provider, provider),
          eq(botChannels.externalId, externalId),
          ignoreId ? ne(botChannels.id, ignoreId) : undefined,
        ),
      )
      .limit(1);
    return Boolean(row);
  }

  async findActiveWithCredentials(id: string): Promise<BotChannelWithCredentials | null> {
    const found = await this.findWithCredentials(id);
    return found?.row.status === 'active' ? found : null;
  }

  async findWithCredentials(id: string): Promise<BotChannelWithCredentials | null> {
    const [row] = await this.db.select().from(botChannels).where(eq(botChannels.id, id)).limit(1);
    if (!row) return null;

    return {
      row,
      credentials: {
        externalId: row.externalId,
        accessToken: decrypt(row.accessTokenEncrypted),
        appSecret: row.appSecretEncrypted ? decrypt(row.appSecretEncrypted) : null,
        verifyToken: row.verifyTokenEncrypted ? decrypt(row.verifyTokenEncrypted) : null,
        webhookSecret: row.webhookSecretEncrypted ? decrypt(row.webhookSecretEncrypted) : null,
        apiVersion: row.graphApiVersion,
      },
    };
  }

  async touch(id: string, error: string | null): Promise<void> {
    await this.db
      .update(botChannels)
      .set({ lastEventAt: new Date(), lastError: error?.slice(0, 2000) ?? null })
      .where(eq(botChannels.id, id));
  }
}
