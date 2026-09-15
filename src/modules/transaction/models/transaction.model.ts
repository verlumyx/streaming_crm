import { relations, sql, type InferInsertModel, type InferSelectModel } from 'drizzle-orm';
import { check, date, index, numeric, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { user } from '@/db/auth-schema';
import { companies } from '@/modules/company/models/company.model';

export const TRANSACTION_TYPES = ['income', 'expense'] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const INCOME_CATEGORIES = ['sale', 'renewal', 'partner_contribution', 'other_income'] as const;
export const EXPENSE_CATEGORIES = [
  'streaming_account',
  'streaming_account_renewal',
  'petty_cash',
  'salary',
  'commission',
  'utilities',
  'tools',
  'marketing',
  'refund',
  'other_expense',
] as const;
export const TRANSACTION_CATEGORIES = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES] as const;
export type TransactionCategory = (typeof TRANSACTION_CATEGORIES)[number];

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = { income: 'Ingreso', expense: 'Egreso' };

export const TRANSACTION_CATEGORY_LABELS: Record<TransactionCategory, string> = {
  sale: 'Venta',
  renewal: 'Renovación',
  partner_contribution: 'Aporte de socio',
  other_income: 'Otro ingreso',
  streaming_account: 'Cuenta de streaming',
  streaming_account_renewal: 'Renovación de cuenta',
  petty_cash: 'Caja chica',
  salary: 'Salario',
  commission: 'Comisión',
  utilities: 'Servicios',
  tools: 'Herramientas',
  marketing: 'Marketing',
  refund: 'Reembolso',
  other_expense: 'Otro gasto',
};

/** Short polymorphic aliases stored in `related_type`. */
export const RELATED_TYPES = ['Account', 'Sale', 'Refund', 'ManualTransaction'] as const;
export type RelatedType = (typeof RELATED_TYPES)[number];

export function typeForCategory(category: string): TransactionType {
  if ((INCOME_CATEGORIES as readonly string[]).includes(category)) return 'income';
  if ((EXPENSE_CATEGORIES as readonly string[]).includes(category)) return 'expense';
  throw new Error(`Unknown transaction category: ${category}`);
}

/** Single source of truth for the UI selects. */
export function transactionCatalog() {
  const categories = TRANSACTION_CATEGORIES.map((value) => ({
    value,
    label: TRANSACTION_CATEGORY_LABELS[value],
    type: typeForCategory(value),
  }));
  return {
    types: TRANSACTION_TYPES.map((value) => ({ value, label: TRANSACTION_TYPE_LABELS[value] })),
    categories,
    income: categories.filter((c) => c.type === 'income'),
    expense: categories.filter((c) => c.type === 'expense'),
  };
}
export type TransactionCatalog = ReturnType<typeof transactionCatalog>;

/** Company ledger. Amounts are always positive; the sign is implied by `type`. Written by Sale, Account, Refund and ManualTransaction. */
export const transactions = pgTable(
  'app_transactions',
  {
    id: uuid('id').primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 10 }).notNull().$type<TransactionType>(),
    category: varchar('category', { length: 50 }).notNull().$type<TransactionCategory>(),
    subcategory: varchar('subcategory', { length: 100 }),
    relatedType: varchar('related_type', { length: 50 }).$type<RelatedType>(),
    relatedId: uuid('related_id'),
    amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('USD'),
    date: date('date').notNull(),
    paymentMethod: varchar('payment_method', { length: 100 }).notNull(),
    reference: varchar('reference', { length: 100 }),
    periodFrom: date('period_from'),
    periodTo: date('period_to'),
    description: varchar('description', { length: 255 }).notNull(),
    notes: text('notes'),
    recordedBy: uuid('recorded_by').references(() => user.id, { onDelete: 'set null' }),
    receiptUrl: varchar('receipt_url', { length: 500 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).$onUpdate(() => new Date()),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    index('app_transactions_company_id_idx').on(t.companyId),
    index('app_transactions_date_idx').on(t.date),
    index('app_transactions_type_date_idx').on(t.type, t.date),
    index('app_transactions_type_category_date_idx').on(t.type, t.category, t.date),
    index('app_transactions_related_idx').on(t.relatedType, t.relatedId),
    check('app_transactions_type_check', sql`${t.type} in ('income', 'expense')`),
    check(
      'app_transactions_category_check',
      sql`${t.category} in ('sale', 'renewal', 'partner_contribution', 'other_income', 'streaming_account', 'streaming_account_renewal', 'petty_cash', 'salary', 'commission', 'utilities', 'tools', 'marketing', 'refund', 'other_expense')`,
    ),
    check('app_transactions_amount_check', sql`${t.amount} >= 0`),
  ],
);

export const transactionsRelations = relations(transactions, ({ one }) => ({
  company: one(companies, { fields: [transactions.companyId], references: [companies.id] }),
  recordedBy: one(user, { fields: [transactions.recordedBy], references: [user.id] }),
}));

export type TransactionRow = InferSelectModel<typeof transactions>;
export type NewTransactionRow = InferInsertModel<typeof transactions>;
