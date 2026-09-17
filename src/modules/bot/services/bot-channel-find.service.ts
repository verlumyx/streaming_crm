import type { BotChannelRow } from '../models/bot-channel.model';
import type { BotChannelRepository } from '../repositories/bot-channel.repository';

export class BotChannelFindService {
  constructor(private readonly repository: BotChannelRepository) {}

  async execute(id: string, companyId: string): Promise<BotChannelRow> {
    return this.repository.findOrFail(id, companyId);
  }
}
