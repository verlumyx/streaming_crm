import type { BotSettingsRow } from '../models/bot-settings.model';
import type { BotSettingsRepository } from '../repositories/bot-settings.repository';

export class BotSettingsFindService {
  constructor(private readonly repository: BotSettingsRepository) {}

  /** Null when the company has never opened the bot console. */
  async execute(companyId: string): Promise<BotSettingsRow | null> {
    return this.repository.findByCompany(companyId);
  }
}
