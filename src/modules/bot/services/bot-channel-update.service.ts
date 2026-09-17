import type { BotChannelRow } from '../models/bot-channel.model';
import type { BotChannelRepository } from '../repositories/bot-channel.repository';
import type { UpdateBotChannelCommand } from '../commands/update-bot-channel.command';

export class BotChannelUpdateService {
  constructor(private readonly repository: BotChannelRepository) {}

  async execute(id: string, companyId: string, command: UpdateBotChannelCommand): Promise<BotChannelRow> {
    const row = await this.repository.findOrFail(id, companyId);
    await this.repository.update(row, command);
    return this.repository.findOrFail(id, companyId);
  }
}
