import { relations, type InferInsertModel, type InferSelectModel } from 'drizzle-orm';
import { index, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { user } from '@/db/auth-schema';

/**
 * Bearer tokens of the mobile API (one row per device). Only the SHA-256 of the token is stored.
 * Independent from better-auth web sessions, so the device limit only counts mobile logins.
 */
export const apiTokens = pgTable(
  'app_api_tokens',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('app_api_tokens_user_id_idx').on(t.userId)],
);

export const apiTokensRelations = relations(apiTokens, ({ one }) => ({
  user: one(user, { fields: [apiTokens.userId], references: [user.id] }),
}));

export type ApiTokenRow = InferSelectModel<typeof apiTokens>;
export type NewApiTokenRow = InferInsertModel<typeof apiTokens>;
