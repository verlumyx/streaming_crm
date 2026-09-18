import type { BotSettingsRow } from '@/modules/bot/models/bot-settings.model';
import {
  DEFAULT_CHAT_MODEL,
  DEFAULT_EMBEDDING_DIMENSIONS,
  DEFAULT_EMBEDDING_MODEL,
} from '@/modules/bot/models/bot-settings.model';
import type { BotAgentIdentity, BotSettingsRepository } from '@/modules/bot/repositories/bot-settings.repository';
import type { UpdateBotSettingsCommand } from '@/modules/bot/commands/update-bot-settings.command';
import { BotSettingsNotFoundException } from '@/modules/bot/exceptions/bot-settings-not-found.exception';
import { uuidv7 } from '@/modules/shared/uuid';

/** In-memory `BotSettingsRepository` for service unit tests. */
export class FakeBotSettingsRepository implements BotSettingsRepository {
  rows: BotSettingsRow[] = [];
  /** How many times the identity was (re-)asserted, per company. */
  identityCalls = new Map<string, number>();

  async findByCompany(companyId: string): Promise<BotSettingsRow | null> {
    return this.rows.find((r) => r.companyId === companyId) ?? null;
  }

  async findOrFail(companyId: string): Promise<BotSettingsRow> {
    const row = await this.findByCompany(companyId);
    if (!row) throw new BotSettingsNotFoundException();
    return row;
  }

  async create(id: string, companyId: string, agentUserId: string): Promise<void> {
    if (await this.findByCompany(companyId)) return;
    this.rows.push({
      id,
      companyId,
      agentUserId,
      status: 'inactive',
      assistantName: 'Asistente',
      personaPrompt: null,
      paymentInstructions: null,
      exchangeRate: null,
      exchangeRateUpdatedAt: null,
      locale: 'es',
      chatModel: DEFAULT_CHAT_MODEL,
      embeddingModel: DEFAULT_EMBEDDING_MODEL,
      embeddingDimensions: DEFAULT_EMBEDDING_DIMENSIONS,
      temperature: '0.20',
      maxToolIterations: 6,
      retrievalTopK: 5,
      retrievalMinScore: '0.650',
      historyWindow: 20,
      handoffEnabled: true,
      handoffMinutes: 60,
      autoCreateClient: true,
      autoCreateSale: true,
      contactDailyMessageLimit: 200,
      createdAt: new Date(),
      updatedAt: null,
    });
  }

  async update(row: BotSettingsRow, command: UpdateBotSettingsCommand): Promise<void> {
    const index = this.rows.findIndex((r) => r.id === row.id);
    // Mirrors the Drizzle repository: the rate's timestamp only moves when the rate itself does.
    const exchangeRate = command.exchangeRate === null ? null : command.exchangeRate.toFixed(4);
    const rateChanged = exchangeRate !== row.exchangeRate;

    this.rows[index] = {
      ...this.rows[index],
      status: command.status,
      assistantName: command.assistantName,
      personaPrompt: command.personaPrompt,
      paymentInstructions: command.paymentInstructions,
      exchangeRate,
      exchangeRateUpdatedAt: rateChanged
        ? exchangeRate === null
          ? null
          : new Date()
        : row.exchangeRateUpdatedAt,
      chatModel: command.chatModel,
      temperature: command.temperature.toFixed(2),
      maxToolIterations: command.maxToolIterations,
      retrievalTopK: command.retrievalTopK,
      retrievalMinScore: command.retrievalMinScore.toFixed(3),
      historyWindow: command.historyWindow,
      handoffEnabled: command.handoffEnabled,
      handoffMinutes: command.handoffMinutes,
      autoCreateClient: command.autoCreateClient,
      autoCreateSale: command.autoCreateSale,
      contactDailyMessageLimit: command.contactDailyMessageLimit,
      updatedAt: new Date(),
    };
  }

  async listAgentUserIds(): Promise<string[]> {
    return this.rows.map((row) => row.agentUserId);
  }

  async ensureAgentIdentity(companyId: string): Promise<BotAgentIdentity> {
    this.identityCalls.set(companyId, (this.identityCalls.get(companyId) ?? 0) + 1);
    const existing = await this.findByCompany(companyId);
    return { userId: existing?.agentUserId ?? uuidv7(), roleId: uuidv7() };
  }
}
