import type { BotChannelRow, BotChannelStatus, BotProvider } from '../models/bot-channel.model';

export type BotChannelDto = {
  id: string;
  provider: BotProvider;
  externalId: string;
  displayName: string;
  wabaId: string | null;
  graphApiVersion: string;
  status: BotChannelStatus;
  /** Secrets never cross the boundary: the UI only learns whether one is stored. */
  hasAccessToken: boolean;
  hasAppSecret: boolean;
  hasVerifyToken: boolean;
  hasWebhookSecret: boolean;
  lastEventAt: string | null;
  lastError: string | null;
  createdAt: string;
};

export function toBotChannelDto(row: BotChannelRow): BotChannelDto {
  return {
    id: row.id,
    provider: row.provider,
    externalId: row.externalId,
    displayName: row.displayName,
    wabaId: row.wabaId,
    graphApiVersion: row.graphApiVersion,
    status: row.status,
    hasAccessToken: Boolean(row.accessTokenEncrypted),
    hasAppSecret: Boolean(row.appSecretEncrypted),
    hasVerifyToken: Boolean(row.verifyTokenEncrypted),
    hasWebhookSecret: Boolean(row.webhookSecretEncrypted),
    lastEventAt: row.lastEventAt?.toISOString() ?? null,
    lastError: row.lastError,
    createdAt: row.createdAt.toISOString(),
  };
}
