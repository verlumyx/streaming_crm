import { uuidv7 } from '@/modules/shared/uuid';
import type { BotSettingsRow } from '../models/bot-settings.model';
import type { BotSettingsRepository } from '../repositories/bot-settings.repository';

/**
 * Prepares a company to run the assistant: the system user that signs its sales, its `Bot` role
 * with the minimum permissions, the membership, and the settings row with defaults.
 *
 * Idempotent — the settings page calls it on first visit and the activation action calls it again.
 */
export class BotSetupService {
  constructor(private readonly repository: BotSettingsRepository) {}

  async execute(companyId: string): Promise<BotSettingsRow> {
    const existing = await this.repository.findByCompany(companyId);
    if (existing) {
      // Re-assert the identity: a role permission may have been added since the first setup.
      await this.repository.ensureAgentIdentity(companyId);
      return existing;
    }

    const { userId } = await this.repository.ensureAgentIdentity(companyId);
    await this.repository.create(uuidv7(), companyId, userId);

    return this.repository.findOrFail(companyId);
  }
}
