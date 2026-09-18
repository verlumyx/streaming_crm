import { beforeEach, describe, expect, it } from 'vitest';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { account, user } from '@/db/auth-schema';
import { roles, rolePermissions } from '@/modules/role/models/role.model';
import { userCompanies } from '@/modules/shared/models/user-company.model';
import { botSettings } from '@/modules/bot/models/bot-settings.model';
import { BOT_AGENT_NAME, BOT_ROLE_NAME, BOT_ROLE_PERMISSIONS } from '@/modules/bot/repositories/drizzle-bot-settings.repository';
import { initialActionState } from '@/modules/shared/actions/action-state';
import { setupBotAction, updateBotSettingsAction } from '@/app/[companyId]/bot/actions';
import { resetDb } from '../../../helpers/reset-db';
import { expectRedirect, setSessionUser } from '../../../helpers/session-mock';
import { assignRoleWithPermissions, createUserWithCompany } from '../../../helpers/company-context';
import { formData } from '../../../helpers/form-data';

const SETTINGS_FORM = {
  status: 'active',
  assistantName: 'Sofía',
  personaPrompt: 'Trata de tú y ofrece primero el plan mensual.',
  paymentInstructions: 'Pago Móvil 0102 — 0412 1234567.',
  exchangeRate: '240,50',
  chatModel: 'gemini-flash-latest',
  temperature: '0.4',
  maxToolIterations: '4',
  retrievalTopK: '8',
  retrievalMinScore: '0.7',
  historyWindow: '10',
  handoffEnabled: 'on',
  handoffMinutes: '30',
  autoCreateClient: 'on',
  autoCreateSale: '',
  contactDailyMessageLimit: '50',
};

async function botUserOf(companyId: string) {
  const [row] = await db
    .select()
    .from(user)
    .where(eq(user.email, `bot+${companyId}@bot.local`))
    .limit(1);
  return row ?? null;
}

describe('Preparar el asistente', () => {
  beforeEach(resetDb);

  it('creates the settings row, inactive, with its own agent user', async () => {
    const { user: admin, company } = await createUserWithCompany(db);
    setSessionUser(admin);

    await expectRedirect(setupBotAction(company.id, initialActionState, formData({})), `/${company.id}/bot/settings`);

    const [settings] = await db.select().from(botSettings).where(eq(botSettings.companyId, company.id));
    const bot = await botUserOf(company.id);
    expect(bot).not.toBeNull();
    expect(settings).toMatchObject({
      status: 'inactive',
      agentUserId: bot!.id,
      assistantName: 'Asistente',
      embeddingDimensions: 768,
    });
  });

  it('the agent user cannot sign in: banned and without a credential account', async () => {
    const { user: admin, company } = await createUserWithCompany(db);
    setSessionUser(admin);
    await expectRedirect(setupBotAction(company.id, initialActionState, formData({})), `/${company.id}/bot/settings`);

    const bot = await botUserOf(company.id);
    expect(bot).toMatchObject({ name: BOT_AGENT_NAME, banned: true, isSystemOwner: false });

    const credentials = await db.select().from(account).where(eq(account.userId, bot!.id));
    expect(credentials).toHaveLength(0);
  });

  it('gives the agent the Bot role with the minimum permissions and an active membership', async () => {
    const { user: admin, company } = await createUserWithCompany(db);
    setSessionUser(admin);
    await expectRedirect(setupBotAction(company.id, initialActionState, formData({})), `/${company.id}/bot/settings`);

    const [role] = await db
      .select()
      .from(roles)
      .where(and(eq(roles.companyId, company.id), eq(roles.name, BOT_ROLE_NAME)));
    expect(role).toMatchObject({ status: 'active', permissionType: 'custom' });

    const granted = await db.select().from(rolePermissions).where(eq(rolePermissions.roleId, role.id));
    expect(granted.map((p) => p.permission).sort()).toEqual([...BOT_ROLE_PERMISSIONS].sort());
    // It can sell, but never approve its own sales nor read streaming credentials.
    expect(granted.map((p) => p.permission)).not.toContain('sales.approve');
    expect(granted.map((p) => p.permission)).not.toContain('accounts.credentials');

    const bot = await botUserOf(company.id);
    const [membership] = await db
      .select()
      .from(userCompanies)
      .where(and(eq(userCompanies.userId, bot!.id), eq(userCompanies.companyId, company.id)));
    expect(membership).toMatchObject({ status: 'active', isDefault: false, roleId: role.id });
  });

  it('is idempotent: pressing it twice keeps one settings row and one agent', async () => {
    const { user: admin, company } = await createUserWithCompany(db);
    setSessionUser(admin);

    await expectRedirect(setupBotAction(company.id, initialActionState, formData({})), `/${company.id}/bot/settings`);
    await expectRedirect(setupBotAction(company.id, initialActionState, formData({})), `/${company.id}/bot/settings`);

    expect(await db.select().from(botSettings).where(eq(botSettings.companyId, company.id))).toHaveLength(1);
    const bots = await db.select().from(user).where(eq(user.name, BOT_AGENT_NAME));
    expect(bots).toHaveLength(1);
  });

  it('gives each company its own agent', async () => {
    const a = await createUserWithCompany(db);
    const b = await createUserWithCompany(db);

    setSessionUser(a.user);
    await expectRedirect(setupBotAction(a.company.id, initialActionState, formData({})), `/${a.company.id}/bot/settings`);
    setSessionUser(b.user);
    await expectRedirect(setupBotAction(b.company.id, initialActionState, formData({})), `/${b.company.id}/bot/settings`);

    const botA = await botUserOf(a.company.id);
    const botB = await botUserOf(b.company.id);
    expect(botA!.id).not.toBe(botB!.id);
  });

  it('requires the bot.configure permission', async () => {
    const { user: admin, company } = await createUserWithCompany(db);
    await assignRoleWithPermissions(db, admin.id, company.id, ['bot.show']);
    setSessionUser(admin);

    const state = await setupBotAction(company.id, initialActionState, formData({}));

    expect(state.status).toBe('error');
    expect(await db.select().from(botSettings)).toHaveLength(0);
  });
});

describe('Configurar el asistente', () => {
  beforeEach(resetDb);

  async function setup() {
    const { user: admin, company } = await createUserWithCompany(db);
    setSessionUser(admin);
    await expectRedirect(setupBotAction(company.id, initialActionState, formData({})), `/${company.id}/bot/settings`);
    return { admin, company };
  }

  it('persists every tunable', async () => {
    const { company } = await setup();

    await expectRedirect(
      updateBotSettingsAction(company.id, initialActionState, formData(SETTINGS_FORM)),
      `/${company.id}/bot/settings`,
    );

    const [settings] = await db.select().from(botSettings).where(eq(botSettings.companyId, company.id));
    expect(settings).toMatchObject({
      status: 'active',
      assistantName: 'Sofía',
      chatModel: 'gemini-flash-latest',
      temperature: '0.40',
      maxToolIterations: 4,
      retrievalTopK: 8,
      retrievalMinScore: '0.700',
      historyWindow: 10,
      handoffEnabled: true,
      handoffMinutes: 30,
      autoCreateClient: true,
      // An unchecked switch submits an empty string, which must read as false.
      autoCreateSale: false,
      contactDailyMessageLimit: 50,
      // Typed with the decimal comma the console shows.
      exchangeRate: '240.5000',
    });
    expect(settings.exchangeRateUpdatedAt).toBeInstanceOf(Date);
  });

  it('only re-stamps the rate when its value changes', async () => {
    const { company } = await setup();
    const save = (form: Record<string, string>) =>
      expectRedirect(
        updateBotSettingsAction(company.id, initialActionState, formData(form)),
        `/${company.id}/bot/settings`,
      );
    const read = async () => (await db.select().from(botSettings).where(eq(botSettings.companyId, company.id)))[0];

    await save(SETTINGS_FORM);
    const first = await read();

    await save({ ...SETTINGS_FORM, assistantName: 'Otro nombre' });
    const untouched = await read();
    expect(untouched.exchangeRateUpdatedAt).toEqual(first.exchangeRateUpdatedAt);

    await save({ ...SETTINGS_FORM, exchangeRate: '250' });
    const restamped = await read();
    expect(restamped.exchangeRate).toBe('250.0000');
    expect(restamped.exchangeRateUpdatedAt!.getTime()).toBeGreaterThanOrEqual(
      first.exchangeRateUpdatedAt!.getTime(),
    );

    await save({ ...SETTINGS_FORM, exchangeRate: '' });
    const cleared = await read();
    expect(cleared.exchangeRate).toBeNull();
    expect(cleared.exchangeRateUpdatedAt).toBeNull();
  });

  it('rejects a rate that is not a positive number', async () => {
    const { company } = await setup();

    for (const exchangeRate of ['abc', '0', '-3']) {
      const state = await updateBotSettingsAction(
        company.id,
        initialActionState,
        formData({ ...SETTINGS_FORM, exchangeRate }),
      );
      expect(state.status, exchangeRate).toBe('error');
      expect(state.fieldErrors?.exchangeRate, exchangeRate).toBeDefined();
    }
  });

  it('keeps the agent user when the configuration changes', async () => {
    const { company } = await setup();
    const [before] = await db.select().from(botSettings).where(eq(botSettings.companyId, company.id));

    await expectRedirect(
      updateBotSettingsAction(company.id, initialActionState, formData(SETTINGS_FORM)),
      `/${company.id}/bot/settings`,
    );

    const [after] = await db.select().from(botSettings).where(eq(botSettings.companyId, company.id));
    expect(after.agentUserId).toBe(before.agentUserId);
  });

  it('rejects values outside their bounds', async () => {
    const { company } = await setup();

    const state = await updateBotSettingsAction(
      company.id,
      initialActionState,
      formData({ ...SETTINGS_FORM, temperature: '5', retrievalMinScore: '2' }),
    );

    expect(state.status).toBe('error');
    expect(state.fieldErrors?.temperature).toBeDefined();
    expect(state.fieldErrors?.retrievalMinScore).toBeDefined();
  });

  it('fails when the company has not prepared the assistant', async () => {
    const { user: admin, company } = await createUserWithCompany(db);
    setSessionUser(admin);

    const state = await updateBotSettingsAction(company.id, initialActionState, formData(SETTINGS_FORM));

    expect(state).toMatchObject({ status: 'error' });
  });

  it('never touches another company configuration', async () => {
    const a = await setup();
    const b = await createUserWithCompany(db);
    setSessionUser(b.user);
    await expectRedirect(setupBotAction(b.company.id, initialActionState, formData({})), `/${b.company.id}/bot/settings`);

    setSessionUser(a.admin);
    await expectRedirect(
      updateBotSettingsAction(a.company.id, initialActionState, formData(SETTINGS_FORM)),
      `/${a.company.id}/bot/settings`,
    );

    const [other] = await db.select().from(botSettings).where(eq(botSettings.companyId, b.company.id));
    expect(other).toMatchObject({ status: 'inactive', assistantName: 'Asistente' });
  });
});
