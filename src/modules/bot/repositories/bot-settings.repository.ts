import type { BotSettingsRow } from '../models/bot-settings.model';
import type { UpdateBotSettingsCommand } from '../commands/update-bot-settings.command';

/** The system user the bot signs its sales with (`app_sales.agent_id` is NOT NULL), and its role. */
export type BotAgentIdentity = { userId: string; roleId: string };

export interface BotSettingsRepository {
  findByCompany(companyId: string): Promise<BotSettingsRow | null>;
  findOrFail(companyId: string): Promise<BotSettingsRow>;
  create(id: string, companyId: string, agentUserId: string): Promise<void>;
  update(row: BotSettingsRow, command: UpdateBotSettingsCommand): Promise<void>;
  /**
   * Idempotent: the `Asistente IA` user, its `Bot` role with the minimum permissions, and its
   * active membership in the company. Safe to call on every activation.
   */
  ensureAgentIdentity(companyId: string): Promise<BotAgentIdentity>;
  /** Every company's bot user: what the stale-sale job needs to know which sales are the bot's. */
  listAgentUserIds(): Promise<string[]>;
}
