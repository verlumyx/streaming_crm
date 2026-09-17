import type { BotSettingsRow } from '../models/bot-settings.model';
import type { BotSettingsRepository } from '../repositories/bot-settings.repository';
import type { UpdateBotSettingsCommand } from '../commands/update-bot-settings.command';

export class BotSettingsUpdateService {
  constructor(private readonly repository: BotSettingsRepository) {}

  async execute(command: UpdateBotSettingsCommand): Promise<BotSettingsRow> {
    const row = await this.repository.findOrFail(command.companyId);
    await this.repository.update(row, command);
    return this.repository.findOrFail(command.companyId);
  }
}
