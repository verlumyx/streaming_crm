import { relations, sql, type InferInsertModel, type InferSelectModel } from 'drizzle-orm';
import { check, index, jsonb, pgTable, smallint, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { companies } from '@/modules/company/models/company.model';
import { botChannels, type BotProvider } from './bot-channel.model';

export const BOT_EVENT_STATUSES = ['pending', 'processing', 'completed', 'failed', 'dlq', 'discarded'] as const;
export type BotEventStatus = (typeof BOT_EVENT_STATUSES)[number];

/** `2^attempts * 15s`, matching the backoff the reference implementation settled on. */
export const BOT_EVENT_BACKOFF_BASE_SECONDS = 15;

/**
 * Durable inbound queue: the webhook persists first and answers 200 second, so a slow model call
 * never makes Meta or Telegram time out. `(provider, external_event_id)` is the idempotency key —
 * both providers retry the same event id, and the unique index turns a retry into a no-op.
 */
export const botEvents = pgTable(
  'app_bot_events',
  {
    // UUID v7: monotonic, so ordering by id is FIFO without a sequence.
    id: uuid('id').primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    channelId: uuid('channel_id')
      .notNull()
      .references(() => botChannels.id, { onDelete: 'restrict' }),
    provider: varchar('provider', { length: 20 }).notNull().$type<BotProvider>(),
    /** WhatsApp `wamid.…`, or `tg:{botId}:{updateId}`. */
    externalEventId: varchar('external_event_id', { length: 128 }).notNull(),
    /** Serializes processing per contact so two quick messages never interleave the thread. */
    contactExternalId: varchar('contact_external_id', { length: 64 }).notNull(),
    payload: jsonb('payload').notNull(),
    status: varchar('status', { length: 20 }).notNull().default('pending').$type<BotEventStatus>(),
    attempts: smallint('attempts').notNull().default(0),
    maxAttempts: smallint('max_attempts').notNull().default(5),
    lastError: text('last_error'),
    availableAt: timestamp('available_at', { withTimezone: true }).notNull().defaultNow(),
    lockedAt: timestamp('locked_at', { withTimezone: true }),
    lockedBy: varchar('locked_by', { length: 64 }),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex('app_bot_events_provider_external_event_id_unique').on(t.provider, t.externalEventId),
    index('app_bot_events_status_available_at_idx').on(t.status, t.availableAt),
    index('app_bot_events_company_id_created_at_idx').on(t.companyId, t.createdAt),
    check(
      'app_bot_events_status_check',
      sql`${t.status} in ('pending', 'processing', 'completed', 'failed', 'dlq', 'discarded')`,
    ),
    check('app_bot_events_attempts_check', sql`${t.attempts} >= 0`),
  ],
);

export const botEventsRelations = relations(botEvents, ({ one }) => ({
  company: one(companies, { fields: [botEvents.companyId], references: [companies.id] }),
  channel: one(botChannels, { fields: [botEvents.channelId], references: [botChannels.id] }),
}));

export type BotEventRow = InferSelectModel<typeof botEvents>;
export type NewBotEventRow = InferInsertModel<typeof botEvents>;
