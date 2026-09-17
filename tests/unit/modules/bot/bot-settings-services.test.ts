import { describe, expect, it } from 'vitest';
import { BotSetupService } from '@/modules/bot/services/bot-setup.service';
import { BotSettingsUpdateService } from '@/modules/bot/services/bot-settings-update.service';
import { BotSettingsFindService } from '@/modules/bot/services/bot-settings-find.service';
import { UpdateBotSettingsCommand } from '@/modules/bot/commands/update-bot-settings.command';
import { BotSettingsNotFoundException } from '@/modules/bot/exceptions/bot-settings-not-found.exception';
import { toBotSettingsDto } from '@/modules/bot/serializers/bot-settings.serializer';
import { FakeBotSettingsRepository } from './fake-bot-settings.repository';

const COMPANY = '0192f3a0-0000-7000-8000-00000000c001';
const OTHER_COMPANY = '0192f3a0-0000-7000-8000-00000000c002';

function updateCommand(companyId: string, overrides: Partial<UpdateBotSettingsCommand> = {}) {
  const base = {
    status: 'active' as const,
    assistantName: 'Vendedor',
    personaPrompt: 'Sé breve.',
    paymentInstructions: 'Paga al Pago Móvil 0102.',
    chatModel: 'gemini-flash-latest',
    temperature: 0.4,
    maxToolIterations: 4,
    retrievalTopK: 8,
    retrievalMinScore: 0.7,
    historyWindow: 10,
    handoffEnabled: false,
    handoffMinutes: 30,
    autoCreateClient: true,
    autoCreateSale: false,
    contactDailyMessageLimit: 50,
    ...overrides,
  };
  return new UpdateBotSettingsCommand(
    companyId,
    base.status,
    base.assistantName,
    base.personaPrompt,
    base.paymentInstructions,
    base.chatModel,
    base.temperature,
    base.maxToolIterations,
    base.retrievalTopK,
    base.retrievalMinScore,
    base.historyWindow,
    base.handoffEnabled,
    base.handoffMinutes,
    base.autoCreateClient,
    base.autoCreateSale,
    base.contactDailyMessageLimit,
  );
}

describe('BotSetupService', () => {
  it('creates the settings row with safe defaults and an agent user', async () => {
    const repository = new FakeBotSettingsRepository();
    const settings = await new BotSetupService(repository).execute(COMPANY);

    expect(settings.companyId).toBe(COMPANY);
    expect(settings.agentUserId).toBeTruthy();
    // The bot never starts answering by itself: an admin has to enable it.
    expect(settings.status).toBe('inactive');
    expect(settings.autoCreateSale).toBe(true);
    expect(settings.embeddingDimensions).toBe(768);
  });

  it('is idempotent and keeps the same agent user', async () => {
    const repository = new FakeBotSettingsRepository();
    const service = new BotSetupService(repository);

    const first = await service.execute(COMPANY);
    const second = await service.execute(COMPANY);

    expect(repository.rows).toHaveLength(1);
    expect(second.id).toBe(first.id);
    expect(second.agentUserId).toBe(first.agentUserId);
  });

  it('re-asserts the identity on every run, so new role permissions are picked up', async () => {
    const repository = new FakeBotSettingsRepository();
    const service = new BotSetupService(repository);

    await service.execute(COMPANY);
    await service.execute(COMPANY);

    expect(repository.identityCalls.get(COMPANY)).toBe(2);
  });

  it('gives each company its own settings and agent', async () => {
    const repository = new FakeBotSettingsRepository();
    const service = new BotSetupService(repository);

    const a = await service.execute(COMPANY);
    const b = await service.execute(OTHER_COMPANY);

    expect(a.agentUserId).not.toBe(b.agentUserId);
    expect(repository.rows).toHaveLength(2);
  });
});

describe('BotSettingsUpdateService', () => {
  it('applies every tunable and keeps the agent user untouched', async () => {
    const repository = new FakeBotSettingsRepository();
    const created = await new BotSetupService(repository).execute(COMPANY);

    const updated = await new BotSettingsUpdateService(repository).execute(updateCommand(COMPANY));

    expect(updated.agentUserId).toBe(created.agentUserId);
    expect(toBotSettingsDto(updated)).toMatchObject({
      status: 'active',
      assistantName: 'Vendedor',
      temperature: 0.4,
      retrievalTopK: 8,
      retrievalMinScore: 0.7,
      handoffEnabled: false,
      autoCreateSale: false,
      contactDailyMessageLimit: 50,
    });
  });

  it('fails when the company has no settings yet', async () => {
    const repository = new FakeBotSettingsRepository();

    await expect(new BotSettingsUpdateService(repository).execute(updateCommand(COMPANY))).rejects.toBeInstanceOf(
      BotSettingsNotFoundException,
    );
  });

  it('never touches another company settings', async () => {
    const repository = new FakeBotSettingsRepository();
    const setup = new BotSetupService(repository);
    await setup.execute(COMPANY);
    const other = await setup.execute(OTHER_COMPANY);

    await new BotSettingsUpdateService(repository).execute(updateCommand(COMPANY));

    const untouched = await new BotSettingsFindService(repository).execute(OTHER_COMPANY);
    expect(untouched).toMatchObject({ id: other.id, status: 'inactive', assistantName: 'Asistente' });
  });
});

describe('BotSettingsFindService', () => {
  it('returns null before the company ever opened the console', async () => {
    const repository = new FakeBotSettingsRepository();
    await expect(new BotSettingsFindService(repository).execute(COMPANY)).resolves.toBeNull();
  });
});
