import { relations, sql, type InferInsertModel, type InferSelectModel } from 'drizzle-orm';
import { check, index, numeric, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { user } from '@/db/auth-schema';
import { companies } from '@/modules/company/models/company.model';
import { sales } from '@/modules/sale/models/sale.model';
import { clients } from '@/modules/client/models/client.model';

export const REFUND_CODE_PREFIX = 'REF';
export const REFUND_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type RefundStatus = (typeof REFUND_STATUSES)[number];

export const refunds = pgTable(
  'app_refunds',
  {
    id: uuid('id').primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    code: varchar('code', { length: 12 }).notNull(),
    saleId: uuid('sale_id')
      .notNull()
      .references(() => sales.id, { onDelete: 'restrict' }),
    /** Snapshot of `sale.client_id`. */
    clientId: uuid('client_id')
      .notNull()
      .references(() => clients.id, { onDelete: 'restrict' }),
    amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
    reason: varchar('reason', { length: 255 }),
    status: varchar('status', { length: 20 }).notNull().default('pending').$type<RefundStatus>(),
    requestedBy: uuid('requested_by').references(() => user.id, { onDelete: 'set null' }),
    resolvedBy: uuid('resolved_by').references(() => user.id, { onDelete: 'set null' }),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).$onUpdate(() => new Date()),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('app_refunds_company_id_code_unique').on(t.companyId, t.code),
    index('app_refunds_sale_id_idx').on(t.saleId),
    index('app_refunds_status_idx').on(t.status),
    index('app_refunds_created_at_idx').on(t.createdAt),
    check('app_refunds_amount_check', sql`${t.amount} >= 0`),
    check('app_refunds_status_check', sql`${t.status} in ('pending', 'approved', 'rejected')`),
  ],
);

export const refundsRelations = relations(refunds, ({ one }) => ({
  company: one(companies, { fields: [refunds.companyId], references: [companies.id] }),
  sale: one(sales, { fields: [refunds.saleId], references: [sales.id] }),
  client: one(clients, { fields: [refunds.clientId], references: [clients.id] }),
  requestedBy: one(user, { fields: [refunds.requestedBy], references: [user.id], relationName: 'refund_requested_by' }),
  resolvedBy: one(user, { fields: [refunds.resolvedBy], references: [user.id], relationName: 'refund_resolved_by' }),
}));

export type RefundRow = InferSelectModel<typeof refunds>;
export type NewRefundRow = InferInsertModel<typeof refunds>;
