import type { BotSettingsStatus } from '../models/bot-settings.model';
import type { UpdateBotSettingsInput } from '../validation/update-bot-settings.schema';

export class UpdateBotSettingsCommand {
  constructor(
    readonly companyId: string,
    readonly status: BotSettingsStatus,
    readonly assistantName: string,
    readonly personaPrompt: string | null,
    readonly paymentInstructions: string | null,
    readonly chatModel: string,
    readonly temperature: number,
    readonly maxToolIterations: number,
    readonly retrievalTopK: number,
    readonly retrievalMinScore: number,
    readonly historyWindow: number,
    readonly handoffEnabled: boolean,
    readonly handoffMinutes: number,
    readonly autoCreateClient: boolean,
    readonly autoCreateSale: boolean,
    readonly contactDailyMessageLimit: number,
  ) {}

  static fromInput(input: UpdateBotSettingsInput, companyId: string): UpdateBotSettingsCommand {
    return new UpdateBotSettingsCommand(
      companyId,
      input.status,
      input.assistantName,
      input.personaPrompt,
      input.paymentInstructions,
      input.chatModel,
      input.temperature,
      input.maxToolIterations,
      input.retrievalTopK,
      input.retrievalMinScore,
      input.historyWindow,
      input.handoffEnabled,
      input.handoffMinutes,
      input.autoCreateClient,
      input.autoCreateSale,
      input.contactDailyMessageLimit,
    );
  }
}
