import type { BotChannelRow, BotChannelStatus } from '../models/bot-channel.model';
import type { BotChannelRepository } from '../repositories/bot-channel.repository';

/** Actualizar Estado. Deactivating a channel makes its webhook stop accepting events. */
export class BotChannelUpdateStatusService {
  constructor(private readonly repository: BotChannelRepository) {}

  async execute(id: string, companyId: string, status: BotChannelStatus): Promise<BotChannelRow> {
    const row = await this.repository.findOrFail(id, companyId);
    await this.repository.updateStatus(row, status);
    return this.repository.findOrFail(id, companyId);
  }
}
