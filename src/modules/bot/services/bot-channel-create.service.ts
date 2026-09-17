import type { BotChannelRow } from '../models/bot-channel.model';
import type { BotChannelRepository } from '../repositories/bot-channel.repository';
import { CreateBotChannelCommand } from '../commands/create-bot-channel.command';
import type { CreateBotChannelInput } from '../validation/create-bot-channel.schema';
import { BotChannelAlreadyExistsException } from '../exceptions/bot-channel-already-exists.exception';

/**
 * Identifies the channel behind a token. For Telegram this is a `getMe` call, which is why it is a
 * port: unit tests provide a fake instead of reaching api.telegram.org.
 */
export interface ChannelIdentityResolver {
  resolve(input: CreateBotChannelInput): Promise<{ externalId: string; displayName: string; webhookSecret: string | null }>;
}

export class BotChannelCreateService {
  constructor(
    private readonly repository: BotChannelRepository,
    private readonly identity: ChannelIdentityResolver,
  ) {}

  async execute(input: CreateBotChannelInput, companyId: string): Promise<BotChannelRow> {
    const resolved = await this.identity.resolve(input);

    if (await this.repository.existsByExternalId(input.provider, resolved.externalId)) {
      throw new BotChannelAlreadyExistsException();
    }

    await this.repository.create(CreateBotChannelCommand.fromInput(input, companyId, resolved));

    return this.repository.findOrFail(input.id, companyId);
  }
}
