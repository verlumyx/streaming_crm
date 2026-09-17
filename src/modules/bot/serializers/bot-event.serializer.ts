import type { BotProvider } from '../models/bot-channel.model';
import type { BotEventRow, BotEventStatus } from '../models/bot-event.model';

export type BotEventDto = {
  id: string;
  provider: BotProvider;
  externalEventId: string;
  contactExternalId: string;
  /** The inbound text, when there was one. */
  preview: string | null;
  status: BotEventStatus;
  attempts: number;
  maxAttempts: number;
  lastError: string | null;
  availableAt: string;
  createdAt: string;
  processedAt: string | null;
};

export function toBotEventDto(row: BotEventRow): BotEventDto {
  const payload = row.payload as { text?: string | null } | null;

  return {
    id: row.id,
    provider: row.provider,
    externalEventId: row.externalEventId,
    contactExternalId: row.contactExternalId,
    preview: payload?.text ?? null,
    status: row.status,
    attempts: row.attempts,
    maxAttempts: row.maxAttempts,
    lastError: row.lastError,
    availableAt: row.availableAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    processedAt: row.processedAt?.toISOString() ?? null,
  };
}
