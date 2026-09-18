import { relations, sql, type InferInsertModel, type InferSelectModel } from 'drizzle-orm';
import { boolean, check, integer, numeric, pgTable, smallint, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { user } from '@/db/auth-schema';
import { companies } from '@/modules/company/models/company.model';

export const BOT_SETTINGS_STATUSES = ['active', 'inactive'] as const;
export type BotSettingsStatus = (typeof BOT_SETTINGS_STATUSES)[number];

export const DEFAULT_CHAT_MODEL = 'gemini-flash-latest';
export const DEFAULT_EMBEDDING_MODEL = 'gemini-embedding-001';
/** Its Azure counterpart, truncated to the same dimensions. */
export const DEFAULT_AZURE_EMBEDDING_MODEL = 'text-embedding-3-small';
/** Matryoshka output dimension of `gemini-embedding-001`. Changing it invalidates every stored chunk. */
export const DEFAULT_EMBEDDING_DIMENSIONS = 768;

/**
 * One row per company: everything an admin can tune about the assistant.
 * `agentUserId` is the system user the bot signs its sales with (`app_sales.agent_id` is NOT NULL).
 */
export const botSettings = pgTable(
  'app_bot_settings',
  {
    id: uuid('id').primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    agentUserId: uuid('agent_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    status: varchar('status', { length: 20 }).notNull().default('inactive').$type<BotSettingsStatus>(),
    assistantName: varchar('assistant_name', { length: 100 }).notNull().default('Asistente'),
    /** Business instructions written by the admin. Always subordinate to the system rules. */
    personaPrompt: text('persona_prompt'),
    /** What the bot replies once the sale is registered and waiting for payment verification. */
    paymentInstructions: text('payment_instructions'),
    /**
     * Bolívares per dollar. Null = the company does not quote in bolívares and the bot must never
     * mention a rate. A rate older than `EXCHANGE_RATE_MAX_AGE_HOURS` stops being usable.
     */
    exchangeRate: numeric('exchange_rate', { precision: 14, scale: 4 }),
    /** Bumped by the repository only when the rate actually changes, so its age is truthful. */
    exchangeRateUpdatedAt: timestamp('exchange_rate_updated_at', { withTimezone: true }),
    locale: varchar('locale', { length: 10 }).notNull().default('es'),
    chatModel: varchar('chat_model', { length: 60 }).notNull().default(DEFAULT_CHAT_MODEL),
    embeddingModel: varchar('embedding_model', { length: 60 }).notNull().default(DEFAULT_EMBEDDING_MODEL),
    embeddingDimensions: smallint('embedding_dimensions').notNull().default(DEFAULT_EMBEDDING_DIMENSIONS),
    temperature: numeric('temperature', { precision: 3, scale: 2 }).notNull().default('0.20'),
    maxToolIterations: smallint('max_tool_iterations').notNull().default(6),
    retrievalTopK: smallint('retrieval_top_k').notNull().default(5),
    retrievalMinScore: numeric('retrieval_min_score', { precision: 4, scale: 3 }).notNull().default('0.650'),
    /** How many past messages of the thread are replayed to the model. */
    historyWindow: smallint('history_window').notNull().default(20),
    handoffEnabled: boolean('handoff_enabled').notNull().default(true),
    handoffMinutes: integer('handoff_minutes').notNull().default(60),
    autoCreateClient: boolean('auto_create_client').notNull().default(true),
    autoCreateSale: boolean('auto_create_sale').notNull().default(true),
    /** Durable backstop for abuse: the in-memory rate limiter does not survive a restart. */
    contactDailyMessageLimit: integer('contact_daily_message_limit').notNull().default(200),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex('app_bot_settings_company_id_unique').on(t.companyId),
    check('app_bot_settings_status_check', sql`${t.status} in ('active', 'inactive')`),
    check('app_bot_settings_temperature_check', sql`${t.temperature} >= 0 and ${t.temperature} <= 2`),
    check('app_bot_settings_max_tool_iterations_check', sql`${t.maxToolIterations} between 1 and 12`),
    check('app_bot_settings_retrieval_top_k_check', sql`${t.retrievalTopK} between 1 and 20`),
    check('app_bot_settings_retrieval_min_score_check', sql`${t.retrievalMinScore} >= 0 and ${t.retrievalMinScore} <= 1`),
    check('app_bot_settings_history_window_check', sql`${t.historyWindow} between 2 and 100`),
    check('app_bot_settings_exchange_rate_check', sql`${t.exchangeRate} is null or ${t.exchangeRate} > 0`),
  ],
);

export const botSettingsRelations = relations(botSettings, ({ one }) => ({
  company: one(companies, { fields: [botSettings.companyId], references: [companies.id] }),
  agent: one(user, { fields: [botSettings.agentUserId], references: [user.id] }),
}));

export type BotSettingsRow = InferSelectModel<typeof botSettings>;
export type NewBotSettingsRow = InferInsertModel<typeof botSettings>;
