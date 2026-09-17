import type { BotEventRow } from '../models/bot-event.model';
import type { BotProvider } from '../models/bot-channel.model';
import type { InboundMessage } from '../channels/channel-gateway';

export type EnqueueBotEventData = {
  id: string;
  companyId: string;
  channelId: string;
  provider: BotProvider;
  externalEventId: string;
  contactExternalId: string;
  payload: InboundMessage;
};

export type BotEventSearch = {
  companyId: string;
  status?: BotEventRow['status'];
  limit: number;
  offset: number;
};

export interface BotEventRepository {
  /** Idempotent: a provider retry of the same event id is a no-op. Returns false when duplicated. */
  enqueue(data: EnqueueBotEventData): Promise<boolean>;
  /** `FOR UPDATE SKIP LOCKED`: several workers drain the queue without stepping on each other. */
  claim(limit: number, workerId: string): Promise<BotEventRow[]>;
  markCompleted(id: string): Promise<void>;
  /** Back to `pending` with an exponential delay, or to the dead-letter queue when out of attempts. */
  markFailed(row: BotEventRow, error: string): Promise<'failed' | 'dlq'>;
  /** Acknowledged but deliberately not answered (blocked contact, unsupported media, bot off). */
  markDiscarded(id: string, reason: string): Promise<void>;
  /** Returns `processing` rows whose worker died back to the queue. */
  reclaimStuck(olderThanMinutes: number): Promise<number>;
  /** Manual retry from the console. */
  requeue(id: string, companyId: string): Promise<boolean>;

  search(search: BotEventSearch): Promise<{ data: BotEventRow[]; total: number }>;
  countByStatus(companyId: string): Promise<Record<BotEventRow['status'], number>>;
}
