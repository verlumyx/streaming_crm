import 'server-only';
import { and, eq } from 'drizzle-orm';
import type { DbExecutor } from '@/modules/shared/infrastructure/db-executor';
import { user } from '@/db/auth-schema';
import { roles, rolePermissions } from '@/modules/role/models/role.model';
import { userCompanies } from '@/modules/shared/models/user-company.model';
import { uuidv7 } from '@/modules/shared/uuid';
import { CLIENT_PERMISSIONS } from '@/modules/client/permissions';
import { SALE_PERMISSIONS } from '@/modules/sale/permissions';
import { botSettings, type BotSettingsRow } from '../models/bot-settings.model';
import type { UpdateBotSettingsCommand } from '../commands/update-bot-settings.command';
import { BotSettingsNotFoundException } from '../exceptions/bot-settings-not-found.exception';
import type { BotAgentIdentity, BotSettingsRepository } from './bot-settings.repository';

export const BOT_AGENT_NAME = 'Asistente IA';
export const BOT_ROLE_NAME = 'Bot';

/** Everything the bot may do on its own. Deliberately minimal: it can sell, never approve or read accounts. */
export const BOT_ROLE_PERMISSIONS: readonly string[] = [
  CLIENT_PERMISSIONS.LIST,
  CLIENT_PERMISSIONS.CREATE,
  SALE_PERMISSIONS.LIST,
  SALE_PERMISSIONS.CREATE,
];

/** `users.email` is unique, which is what makes `ensureAgentIdentity` idempotent. */
const agentEmail = (companyId: string) => `bot+${companyId}@bot.local`;

export class DrizzleBotSettingsRepository implements BotSettingsRepository {
  constructor(private readonly db: DbExecutor) {}

  async findByCompany(companyId: string): Promise<BotSettingsRow | null> {
    const [row] = await this.db.select().from(botSettings).where(eq(botSettings.companyId, companyId)).limit(1);
    return row ?? null;
  }

  async findOrFail(companyId: string): Promise<BotSettingsRow> {
    const row = await this.findByCompany(companyId);
    if (!row) throw new BotSettingsNotFoundException();
    return row;
  }

  async create(id: string, companyId: string, agentUserId: string): Promise<void> {
    await this.db.insert(botSettings).values({ id, companyId, agentUserId }).onConflictDoNothing();
  }

  async update(row: BotSettingsRow, command: UpdateBotSettingsCommand): Promise<void> {
    await this.db
      .update(botSettings)
      .set({
        status: command.status,
        assistantName: command.assistantName,
        personaPrompt: command.personaPrompt,
        paymentInstructions: command.paymentInstructions,
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
      })
      .where(eq(botSettings.id, row.id));
  }

  async listAgentUserIds(): Promise<string[]> {
    const rows = await this.db.select({ id: botSettings.agentUserId }).from(botSettings);
    return rows.map((row) => row.id);
  }

  async ensureAgentIdentity(companyId: string): Promise<BotAgentIdentity> {
    const userId = await this.ensureAgentUser(companyId);
    const roleId = await this.ensureBotRole(companyId);
    await this.ensureMembership(userId, companyId, roleId);
    return { userId, roleId };
  }

  /**
   * The bot user can never sign in: it is `banned` and has no `accounts` row, so better-auth has
   * no credential provider for it. Two independent barriers on purpose.
   */
  private async ensureAgentUser(companyId: string): Promise<string> {
    const email = agentEmail(companyId);
    const [existing] = await this.db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1);
    if (existing) return existing.id;

    const id = uuidv7();
    await this.db.insert(user).values({
      id,
      name: BOT_AGENT_NAME,
      email,
      emailVerified: true,
      isSystemOwner: false,
      banned: true,
      banReason: 'Usuario de sistema (bot). No puede iniciar sesión.',
    });
    return id;
  }

  private async ensureBotRole(companyId: string): Promise<string> {
    const [existing] = await this.db
      .select({ id: roles.id })
      .from(roles)
      .where(and(eq(roles.companyId, companyId), eq(roles.name, BOT_ROLE_NAME)))
      .limit(1);

    const roleId = existing?.id ?? uuidv7();
    if (!existing) {
      await this.db.insert(roles).values({
        id: roleId,
        companyId,
        name: BOT_ROLE_NAME,
        status: 'active',
        description: 'Permisos mínimos del asistente: registrar clientes y ventas por aprobar.',
        permissionType: 'custom',
      });
    }

    // Re-asserted on every setup so a permission added to the list later is picked up.
    await this.db
      .insert(rolePermissions)
      .values(BOT_ROLE_PERMISSIONS.map((permission) => ({ id: uuidv7(), roleId, permission })))
      .onConflictDoNothing();

    return roleId;
  }

  private async ensureMembership(userId: string, companyId: string, roleId: string): Promise<void> {
    const [existing] = await this.db
      .select({ id: userCompanies.id })
      .from(userCompanies)
      .where(and(eq(userCompanies.userId, userId), eq(userCompanies.companyId, companyId)))
      .limit(1);

    if (existing) {
      await this.db.update(userCompanies).set({ roleId, status: 'active' }).where(eq(userCompanies.id, existing.id));
      return;
    }

    await this.db
      .insert(userCompanies)
      .values({ id: uuidv7(), userId, companyId, roleId, status: 'active', isDefault: false });
  }
}
