import { relations, sql, type InferInsertModel, type InferSelectModel } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { user } from '@/db/auth-schema';
import { companies } from '@/modules/company/models/company.model';
import { clients } from '@/modules/client/models/client.model';
import { botChannels, type BotProvider } from '@/modules/bot/models/bot-channel.model';
import { botEvents } from '@/modules/bot/models/bot-event.model';

export const CONVERSATION_CODE_PREFIX = 'CNV';

export const BOT_CONTACT_STATUSES = ['active', 'blocked'] as const;
export type BotContactStatus = (typeof BOT_CONTACT_STATUSES)[number];

export const CONVERSATION_STATUSES = ['open', 'closed'] as const;
export type ConversationStatus = (typeof CONVERSATION_STATUSES)[number];

/** Who is answering right now. `human` silences the bot until the handoff expires or is returned. */
export const CONVERSATION_HANDLERS = ['bot', 'human'] as const;
export type ConversationHandler = (typeof CONVERSATION_HANDLERS)[number];

export const BOT_MESSAGE_ROLES = ['user', 'assistant', 'tool', 'agent'] as const;
export type BotMessageRole = (typeof BOT_MESSAGE_ROLES)[number];

export const BOT_MESSAGE_STATUSES = ['queued', 'sent', 'delivered', 'failed'] as const;
export type BotMessageStatus = (typeof BOT_MESSAGE_STATUSES)[number];

/** Meta refuses free-form text outside this window; the bot is purely reactive so it rarely applies. */
export const WHATSAPP_SERVICE_WINDOW_HOURS = 24;

/**
 * Whoever writes to a channel. `clientId` is the authoritative link to the CRM; when null the
 * resolver falls back to matching `phoneE164` within the company (never across companies).
 */
export const botContacts = pgTable(
  'app_bot_contacts',
  {
    id: uuid('id').primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    channelId: uuid('channel_id')
      .notNull()
      .references(() => botChannels.id, { onDelete: 'restrict' }),
    provider: varchar('provider', { length: 20 }).notNull().$type<BotProvider>(),
    /** WhatsApp `wa_id`, Telegram `chat_id`. */
    externalId: varchar('external_id', { length: 64 }).notNull(),
    phoneE164: varchar('phone_e164', { length: 20 }),
    displayName: varchar('display_name', { length: 150 }),
    clientId: uuid('client_id').references(() => clients.id, { onDelete: 'set null' }),
    status: varchar('status', { length: 20 }).notNull().default('active').$type<BotContactStatus>(),
    blockedReason: varchar('blocked_reason', { length: 255 }),
    blockedAt: timestamp('blocked_at', { withTimezone: true }),
    blockedBy: uuid('blocked_by').references(() => user.id, { onDelete: 'set null' }),
    lastInboundAt: timestamp('last_inbound_at', { withTimezone: true }),
    lastOutboundAt: timestamp('last_outbound_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex('app_bot_contacts_channel_id_external_id_unique').on(t.channelId, t.externalId),
    index('app_bot_contacts_company_id_phone_e164_idx').on(t.companyId, t.phoneE164),
    index('app_bot_contacts_client_id_idx').on(t.clientId),
    check('app_bot_contacts_status_check', sql`${t.status} in ('active', 'blocked')`),
  ],
);

/** One thread per contact. A contact can only have a single `open` conversation at a time. */
export const botConversations = pgTable(
  'app_bot_conversations',
  {
    id: uuid('id').primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    contactId: uuid('contact_id')
      .notNull()
      .references(() => botContacts.id, { onDelete: 'restrict' }),
    channelId: uuid('channel_id')
      .notNull()
      .references(() => botChannels.id, { onDelete: 'restrict' }),
    code: varchar('code', { length: 12 }).notNull(),
    status: varchar('status', { length: 20 }).notNull().default('open').$type<ConversationStatus>(),
    handledBy: varchar('handled_by', { length: 10 }).notNull().default('bot').$type<ConversationHandler>(),
    assignedUserId: uuid('assigned_user_id').references(() => user.id, { onDelete: 'set null' }),
    handoffReason: varchar('handoff_reason', { length: 255 }),
    handoffAt: timestamp('handoff_at', { withTimezone: true }),
    handoffExpiresAt: timestamp('handoff_expires_at', { withTimezone: true }),
    lastMessageAt: timestamp('last_message_at', { withTimezone: true }),
    /** Drives the WhatsApp 24 h service window. */
    lastInboundAt: timestamp('last_inbound_at', { withTimezone: true }),
    messageCount: integer('message_count').notNull().default(0),
    closedAt: timestamp('closed_at', { withTimezone: true }),
    closedReason: varchar('closed_reason', { length: 255 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex('app_bot_conversations_company_id_code_unique').on(t.companyId, t.code),
    uniqueIndex('app_bot_conversations_contact_id_open_unique')
      .on(t.contactId)
      .where(sql`${t.status} = 'open'`),
    index('app_bot_conversations_company_id_status_last_message_at_idx').on(t.companyId, t.status, t.lastMessageAt),
    check('app_bot_conversations_status_check', sql`${t.status} in ('open', 'closed')`),
    check('app_bot_conversations_handled_by_check', sql`${t.handledBy} in ('bot', 'human')`),
  ],
);

/**
 * Every turn of the thread, including tool calls, for auditing and for replaying context.
 * `eventId` is what makes delivery at-most-once: before calling the model the orchestrator checks
 * whether an `assistant` message was already sent for that event, so a crash after sending but
 * before committing never answers the customer twice.
 */
export const botMessages = pgTable(
  'app_bot_messages',
  {
    id: uuid('id').primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => botConversations.id, { onDelete: 'cascade' }),
    eventId: uuid('event_id').references(() => botEvents.id, { onDelete: 'set null' }),
    role: varchar('role', { length: 16 }).notNull().$type<BotMessageRole>(),
    content: text('content').notNull(),
    toolName: varchar('tool_name', { length: 60 }),
    toolArgs: jsonb('tool_args'),
    toolResult: jsonb('tool_result'),
    externalMessageId: varchar('external_message_id', { length: 128 }),
    status: varchar('status', { length: 20 }).notNull().default('sent').$type<BotMessageStatus>(),
    error: text('error'),
    /** Set when `role = 'agent'`: a human answered from the console. */
    authorUserId: uuid('author_user_id').references(() => user.id, { onDelete: 'set null' }),
    tokenUsage: jsonb('token_usage'),
    latencyMs: integer('latency_ms'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('app_bot_messages_conversation_id_created_at_idx').on(t.conversationId, t.createdAt),
    uniqueIndex('app_bot_messages_company_id_external_message_id_unique').on(t.companyId, t.externalMessageId),
    index('app_bot_messages_event_id_idx').on(t.eventId),
    check('app_bot_messages_role_check', sql`${t.role} in ('user', 'assistant', 'tool', 'agent')`),
    check('app_bot_messages_status_check', sql`${t.status} in ('queued', 'sent', 'delivered', 'failed')`),
  ],
);

export const botContactsRelations = relations(botContacts, ({ one, many }) => ({
  company: one(companies, { fields: [botContacts.companyId], references: [companies.id] }),
  channel: one(botChannels, { fields: [botContacts.channelId], references: [botChannels.id] }),
  client: one(clients, { fields: [botContacts.clientId], references: [clients.id] }),
  conversations: many(botConversations),
}));

export const botConversationsRelations = relations(botConversations, ({ one, many }) => ({
  company: one(companies, { fields: [botConversations.companyId], references: [companies.id] }),
  contact: one(botContacts, { fields: [botConversations.contactId], references: [botContacts.id] }),
  channel: one(botChannels, { fields: [botConversations.channelId], references: [botChannels.id] }),
  assignedUser: one(user, { fields: [botConversations.assignedUserId], references: [user.id] }),
  messages: many(botMessages),
}));

export const botMessagesRelations = relations(botMessages, ({ one }) => ({
  company: one(companies, { fields: [botMessages.companyId], references: [companies.id] }),
  conversation: one(botConversations, { fields: [botMessages.conversationId], references: [botConversations.id] }),
  event: one(botEvents, { fields: [botMessages.eventId], references: [botEvents.id] }),
  author: one(user, { fields: [botMessages.authorUserId], references: [user.id] }),
}));

export type BotContactRow = InferSelectModel<typeof botContacts>;
export type NewBotContactRow = InferInsertModel<typeof botContacts>;
export type BotConversationRow = InferSelectModel<typeof botConversations>;
export type NewBotConversationRow = InferInsertModel<typeof botConversations>;
export type BotMessageRow = InferSelectModel<typeof botMessages>;
export type NewBotMessageRow = InferInsertModel<typeof botMessages>;
