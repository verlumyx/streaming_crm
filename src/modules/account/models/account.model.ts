import { relations, sql, type InferInsertModel, type InferSelectModel } from 'drizzle-orm';
import {
  check,
  date,
  index,
  numeric,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { user } from '@/db/auth-schema';
import { companies } from '@/modules/company/models/company.model';
import { services } from '@/modules/service/models/service.model';
import { saleProfiles } from '@/modules/sale/models/sale.model';

export const ACCOUNT_CODE_PREFIX = 'ACC';
export const ACCOUNT_STATUSES = ['active', 'down', 'maintenance', 'cancelled'] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export const PROFILE_STATUSES = ['available', 'occupied', 'maintenance'] as const;
export type ProfileStatus = (typeof PROFILE_STATUSES)[number];

/** Allowed manual transitions of a profile status (same → same is always allowed). */
export const PROFILE_TRANSITIONS: Record<ProfileStatus, readonly ProfileStatus[]> = {
  available: ['occupied', 'maintenance'],
  occupied: ['available', 'maintenance'],
  maintenance: ['available', 'occupied'],
};

export function canTransitionProfile(from: ProfileStatus, to: ProfileStatus): boolean {
  return from === to || PROFILE_TRANSITIONS[from].includes(to);
}

export const ACCOUNT_RENEWAL_TYPES = ['purchase', 'renewal'] as const;
export type AccountRenewalType = (typeof ACCOUNT_RENEWAL_TYPES)[number];

/** A real streaming account bought from the platform. Its profiles are the sellable inventory. */
export const accounts = pgTable(
  'app_accounts',
  {
    id: uuid('id').primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    code: varchar('code', { length: 12 }).notNull(),
    serviceId: uuid('service_id')
      .notNull()
      .references(() => services.id, { onDelete: 'restrict' }),
    email: varchar('email', { length: 255 }).notNull(),
    /** AES-256-GCM ciphertext (see `@/modules/shared/crypto`). Never serialized. */
    passwordEncrypted: text('password_encrypted').notNull(),
    cost: numeric('cost', { precision: 10, scale: 2 }).notNull(),
    purchaseDate: date('purchase_date').notNull(),
    nextRenewal: date('next_renewal').notNull(),
    status: varchar('status', { length: 20 }).notNull().default('active').$type<AccountStatus>(),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex('app_accounts_company_id_code_unique').on(t.companyId, t.code),
    uniqueIndex('app_accounts_service_id_email_unique').on(t.serviceId, t.email),
    index('app_accounts_status_idx').on(t.status),
    index('app_accounts_created_at_idx').on(t.createdAt),
    check('app_accounts_cost_check', sql`${t.cost} >= 0`),
    check('app_accounts_status_check', sql`${t.status} in ('active', 'down', 'maintenance', 'cancelled')`),
  ],
);

export const profiles = pgTable(
  'app_profiles',
  {
    id: uuid('id').primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    number: smallint('number').notNull(),
    pin: varchar('pin', { length: 10 }),
    status: varchar('status', { length: 20 }).notNull().default('available').$type<ProfileStatus>(),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex('app_profiles_account_id_number_unique').on(t.accountId, t.number),
    index('app_profiles_status_idx').on(t.status),
    check('app_profiles_number_check', sql`${t.number} >= 1`),
    check('app_profiles_status_check', sql`${t.status} in ('available', 'occupied', 'maintenance')`),
  ],
);

export const accountRenewals = pgTable(
  'app_account_renewals',
  {
    id: uuid('id').primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 20 }).notNull().default('renewal').$type<AccountRenewalType>(),
    amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
    periodStart: date('period_start').notNull(),
    periodEnd: date('period_end').notNull(),
    paidAt: date('paid_at').notNull(),
    notes: text('notes'),
    createdBy: uuid('created_by').references(() => user.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).$onUpdate(() => new Date()),
  },
  (t) => [
    index('app_account_renewals_account_id_created_at_idx').on(t.accountId, t.createdAt),
    index('app_account_renewals_period_end_idx').on(t.periodEnd),
    check('app_account_renewals_amount_check', sql`${t.amount} >= 0`),
    check('app_account_renewals_period_check', sql`${t.periodEnd} >= ${t.periodStart}`),
    check('app_account_renewals_type_check', sql`${t.type} in ('purchase', 'renewal')`),
  ],
);

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  company: one(companies, { fields: [accounts.companyId], references: [companies.id] }),
  service: one(services, { fields: [accounts.serviceId], references: [services.id] }),
  profiles: many(profiles),
  renewals: many(accountRenewals),
}));

export const profilesRelations = relations(profiles, ({ one, many }) => ({
  account: one(accounts, { fields: [profiles.accountId], references: [accounts.id] }),
  saleProfiles: many(saleProfiles),
}));

export const accountRenewalsRelations = relations(accountRenewals, ({ one }) => ({
  account: one(accounts, { fields: [accountRenewals.accountId], references: [accounts.id] }),
  createdBy: one(user, { fields: [accountRenewals.createdBy], references: [user.id] }),
}));

export type AccountRow = InferSelectModel<typeof accounts>;
export type NewAccountRow = InferInsertModel<typeof accounts>;
export type ProfileRow = InferSelectModel<typeof profiles>;
export type NewProfileRow = InferInsertModel<typeof profiles>;
export type AccountRenewalRow = InferSelectModel<typeof accountRenewals>;
export type NewAccountRenewalRow = InferInsertModel<typeof accountRenewals>;
