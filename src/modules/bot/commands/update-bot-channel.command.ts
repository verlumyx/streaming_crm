import type { BotChannelStatus } from '../models/bot-channel.model';
import type { UpdateBotChannelInput } from '../validation/update-bot-channel.schema';

/** A null secret means "keep the stored one": the form never receives a token to send back. */
export class UpdateBotChannelCommand {
  constructor(
    readonly displayName: string,
    readonly accessToken: string | null,
    readonly appSecret: string | null,
    readonly verifyToken: string | null,
    readonly wabaId: string | null,
    readonly graphApiVersion: string,
    readonly status: BotChannelStatus,
  ) {}

  static fromInput(input: UpdateBotChannelInput): UpdateBotChannelCommand {
    return new UpdateBotChannelCommand(
      input.displayName,
      input.accessToken,
      input.appSecret,
      input.verifyToken,
      input.wabaId,
      input.graphApiVersion,
      input.status,
    );
  }
}
