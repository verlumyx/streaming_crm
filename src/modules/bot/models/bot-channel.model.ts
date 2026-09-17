import { relations, sql, type InferInsertModel, type InferSelectModel } from 'drizzle-orm';
import { check, index, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { companies } from '@/modules/company/models/company.model';

export const BOT_PROVIDERS = ['whatsapp', 'telegram'] as const;
export type BotProvider = (typeof BOT_PROVIDERS)[number];

export const BOT_CHANNEL_STATUSES = ['active', 'inactive'] as const;
export type BotChannelStatus = (typeof BOT_CHANNEL_STATUSES)[number];

export const DEFAULT_GRAPH_API_VERSION = 'v21.0';

/**
 * A messaging number/bot wired to a company. The row id is the public webhook segment
 * (`/api/bot/webhooks/{provider}/{id}`): Meta's GET handshake carries no `phone_number_id`, so the
 * channel cannot be resolved from the payload alone. The id is not a secret — the HMAC signature is.
 *
 * Every credential is AES-256-GCM encrypted at rest (`@/modules/shared/crypto`) and never serialized.
 */
export const botChannels = pgTable(
  'app_bot_channels',
  {
    id: uuid('id').primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    provider: varchar('provider', { length: 20 }).notNull().$type<BotProvider>(),
    /** WhatsApp: `phone_number_id`. Telegram: the numeric bot id from `getMe`. */
    externalId: varchar('external_id', { length: 64 }).notNull(),
    displayName: varchar('display_name', { length: 100 }).notNull(),
    accessTokenEncrypted: text('access_token_encrypted').notNull(),
    /** WhatsApp only: verifies `X-Hub-Signature-256`. */
    appSecretEncrypted: text('app_secret_encrypted'),
    /** WhatsApp only: compared against `hub.verify_token` on the GET handshake. */
    verifyTokenEncrypted: text('verify_token_encrypted'),
    /** Telegram only: compared against `X-Telegram-Bot-Api-Secret-Token`. */
    webhookSecretEncrypted: text('webhook_secret_encrypted'),
    graphApiVersion: varchar('graph_api_version', { length: 10 }).notNull().default(DEFAULT_GRAPH_API_VERSION),
    wabaId: varchar('waba_id', { length: 64 }),
    status: varchar('status', { length: 20 }).notNull().default('inactive').$type<BotChannelStatus>(),
    lastEventAt: timestamp('last_event_at', { withTimezone: true }),
    lastError: text('last_error'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).$onUpdate(() => new Date()),
  },
  (t) => [
    // Global (not per company): a phone number / bot belongs to exactly one tenant.
    uniqueIndex('app_bot_channels_provider_external_id_unique').on(t.provider, t.externalId),
    index('app_bot_channels_company_id_provider_idx').on(t.companyId, t.provider),
    check('app_bot_channels_provider_check', sql`${t.provider} in ('whatsapp', 'telegram')`),
    check('app_bot_channels_status_check', sql`${t.status} in ('active', 'inactive')`),
  ],
);

export const botChannelsRelations = relations(botChannels, ({ one }) => ({
  company: one(companies, { fields: [botChannels.companyId], references: [companies.id] }),
}));

export type BotChannelRow = InferSelectModel<typeof botChannels>;
export type NewBotChannelRow = InferInsertModel<typeof botChannels>;
