import type { BotChannelRow } from '../models/bot-channel.model';
import type { BotChannelRepository } from '../repositories/bot-channel.repository';

export class BotChannelListService {
  constructor(private readonly repository: BotChannelRepository) {}

  async execute(companyId: string): Promise<BotChannelRow[]> {
    return this.repository.listByCompany(companyId);
  }
}
