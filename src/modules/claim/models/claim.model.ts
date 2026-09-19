import { relations, sql, type InferInsertModel, type InferSelectModel } from 'drizzle-orm';
import { check, index, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { user } from '@/db/auth-schema';
import { companies } from '@/modules/company/models/company.model';
import { clients } from '@/modules/client/models/client.model';

export const CLAIM_CODE_PREFIX = 'REC';

export const CLAIM_STATUSES = ['open', 'in_progress', 'resolved', 'closed'] as const;
export type ClaimStatus = (typeof CLAIM_STATUSES)[number];

/** Where the client raised the claim. */
export const CLAIM_CHANNELS = ['whatsapp', 'phone', 'email', 'in_person', 'bot', 'other'] as const;
export type ClaimChannel = (typeof CLAIM_CHANNELS)[number];

/** Terminal status: a closed claim admits no further edits nor status changes. */
export const CLAIM_CLOSED_STATUS = 'closed' satisfies ClaimStatus;

/** Statuses that stamp `resolved_by` / `resolved_at`; the rest clear them. */
export const CLAIM_RESOLVED_STATUSES: readonly ClaimStatus[] = ['resolved', 'closed'];

export const claims = pgTable(
  'app_claims',
  {
    id: uuid('id').primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    code: varchar('code', { length: 12 }).notNull(),
    clientId: uuid('client_id')
      .notNull()
      .references(() => clients.id, { onDelete: 'restrict' }),
    subject: varchar('subject', { length: 150 }).notNull(),
    description: text('description').notNull(),
    channel: varchar('channel', { length: 20 }).notNull().default('other').$type<ClaimChannel>(),
    status: varchar('status', { length: 20 }).notNull().default('open').$type<ClaimStatus>(),
    /** Filled when the claim reaches `resolved` / `closed`; kept as history afterwards. */
    resolutionNotes: text('resolution_notes'),
    reportedBy: uuid('reported_by').references(() => user.id, { onDelete: 'set null' }),
    resolvedBy: uuid('resolved_by').references(() => user.id, { onDelete: 'set null' }),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).$onUpdate(() => new Date()),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('app_claims_company_id_code_unique').on(t.companyId, t.code),
    index('app_claims_client_id_idx').on(t.clientId),
    index('app_claims_status_idx').on(t.status),
    index('app_claims_created_at_idx').on(t.createdAt),
    check('app_claims_status_check', sql`${t.status} in ('open', 'in_progress', 'resolved', 'closed')`),
    check('app_claims_channel_check', sql`${t.channel} in ('whatsapp', 'phone', 'email', 'in_person', 'bot', 'other')`),
  ],
);

export const claimsRelations = relations(claims, ({ one }) => ({
  company: one(companies, { fields: [claims.companyId], references: [companies.id] }),
  client: one(clients, { fields: [claims.clientId], references: [clients.id] }),
  reportedBy: one(user, { fields: [claims.reportedBy], references: [user.id], relationName: 'claim_reported_by' }),
  resolvedBy: one(user, { fields: [claims.resolvedBy], references: [user.id], relationName: 'claim_resolved_by' }),
}));

export type ClaimRow = InferSelectModel<typeof claims>;
export type NewClaimRow = InferInsertModel<typeof claims>;
