import { relations, sql, type InferInsertModel, type InferSelectModel } from 'drizzle-orm';
import { check, date, index, numeric, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { user } from '@/db/auth-schema';
import { companies } from '@/modules/company/models/company.model';
import type { TransactionCategory, TransactionType } from '@/modules/transaction/models/transaction.model';

export const MANUAL_TRANSACTION_CODE_PREFIX = 'MTX';
export const MANUAL_TRANSACTION_STATUSES = ['pending', 'approved', 'cancelled'] as const;
export type ManualTransactionStatus = (typeof MANUAL_TRANSACTION_STATUSES)[number];

/** A batch of manual ledger lines. Only `pending` can be approved (→ writes ledger rows) or cancelled. */
export const manualTransactions = pgTable(
  'app_manual_transactions',
  {
    id: uuid('id').primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    code: varchar('code', { length: 12 }).notNull(),
    date: date('date').notNull(),
    paymentMethod: varchar('payment_method', { length: 30 }).notNull(),
    reference: varchar('reference', { length: 100 }),
    currency: varchar('currency', { length: 10 }).notNull().default('USD'),
    description: text('description'),
    notes: text('notes'),
    recordedBy: uuid('recorded_by').references(() => user.id, { onDelete: 'set null' }),
    /** Σ lines.amount, computed on create. */
    total: numeric('total', { precision: 12, scale: 2 }).notNull().default('0'),
    status: varchar('status', { length: 20 }).notNull().default('pending').$type<ManualTransactionStatus>(),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).$onUpdate(() => new Date()),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('app_manual_transactions_company_id_code_unique').on(t.companyId, t.code),
    index('app_manual_transactions_date_idx').on(t.date),
    index('app_manual_transactions_company_status_idx').on(t.companyId, t.status),
    check('app_manual_transactions_total_check', sql`${t.total} >= 0`),
    check('app_manual_transactions_status_check', sql`${t.status} in ('pending', 'approved', 'cancelled')`),
  ],
);

export const manualTransactionLines = pgTable(
  'app_manual_transaction_lines',
  {
    id: uuid('id').primaryKey(),
    manualTransactionId: uuid('manual_transaction_id')
      .notNull()
      .references(() => manualTransactions.id, { onDelete: 'cascade' }),
    /** Derived from `category` on create and persisted. */
    type: varchar('type', { length: 10 }).notNull().$type<TransactionType>(),
    category: varchar('category', { length: 40 }).notNull().$type<TransactionCategory>(),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).$onUpdate(() => new Date()),
  },
  (t) => [
    index('app_manual_transaction_lines_parent_idx').on(t.manualTransactionId),
    check('app_manual_transaction_lines_type_check', sql`${t.type} in ('income', 'expense')`),
    check('app_manual_transaction_lines_amount_check', sql`${t.amount} >= 0`),
  ],
);

export const manualTransactionsRelations = relations(manualTransactions, ({ one, many }) => ({
  company: one(companies, { fields: [manualTransactions.companyId], references: [companies.id] }),
  recordedBy: one(user, { fields: [manualTransactions.recordedBy], references: [user.id] }),
  lines: many(manualTransactionLines),
}));

export const manualTransactionLinesRelations = relations(manualTransactionLines, ({ one }) => ({
  manualTransaction: one(manualTransactions, {
    fields: [manualTransactionLines.manualTransactionId],
    references: [manualTransactions.id],
  }),
}));

export type ManualTransactionRow = InferSelectModel<typeof manualTransactions>;
export type NewManualTransactionRow = InferInsertModel<typeof manualTransactions>;
export type ManualTransactionLineRow = InferSelectModel<typeof manualTransactionLines>;
export type NewManualTransactionLineRow = InferInsertModel<typeof manualTransactionLines>;
