import type { BotSettingsRow, BotSettingsStatus } from '../models/bot-settings.model';

export type BotSettingsDto = {
  id: string;
  status: BotSettingsStatus;
  assistantName: string;
  personaPrompt: string | null;
  paymentInstructions: string | null;
  exchangeRate: number | null;
  exchangeRateUpdatedAt: string | null;
  chatModel: string;
  embeddingModel: string;
  embeddingDimensions: number;
  temperature: number;
  maxToolIterations: number;
  retrievalTopK: number;
  retrievalMinScore: number;
  historyWindow: number;
  handoffEnabled: boolean;
  handoffMinutes: number;
  autoCreateClient: boolean;
  autoCreateSale: boolean;
  contactDailyMessageLimit: number;
  updatedAt: string | null;
};

export function toBotSettingsDto(row: BotSettingsRow): BotSettingsDto {
  return {
    id: row.id,
    status: row.status,
    assistantName: row.assistantName,
    personaPrompt: row.personaPrompt,
    paymentInstructions: row.paymentInstructions,
    exchangeRate: row.exchangeRate === null ? null : Number(row.exchangeRate),
    exchangeRateUpdatedAt: row.exchangeRateUpdatedAt?.toISOString() ?? null,
    chatModel: row.chatModel,
    embeddingModel: row.embeddingModel,
    embeddingDimensions: row.embeddingDimensions,
    temperature: Number(row.temperature),
    maxToolIterations: row.maxToolIterations,
    retrievalTopK: row.retrievalTopK,
    retrievalMinScore: Number(row.retrievalMinScore),
    historyWindow: row.historyWindow,
    handoffEnabled: row.handoffEnabled,
    handoffMinutes: row.handoffMinutes,
    autoCreateClient: row.autoCreateClient,
    autoCreateSale: row.autoCreateSale,
    contactDailyMessageLimit: row.contactDailyMessageLimit,
    updatedAt: row.updatedAt?.toISOString() ?? null,
  };
}
