import { relations, sql, type InferInsertModel, type InferSelectModel } from 'drizzle-orm';
import {
  check,
  date,
  index,
  integer,
  numeric,
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
import { plans } from '@/modules/plan/models/plan.model';
import { services } from '@/modules/service/models/service.model';
import { profiles } from '@/modules/account/models/account.model';

export const SALE_CODE_PREFIX = 'SAL';
/** `pending` (por aprobar) → `active` once the payment is verified, or `rejected`. Only approved sales occupy profiles. */
export const SALE_STATUSES = ['pending', 'active', 'expired', 'cancelled', 'rejected'] as const;
export type SaleStatus = (typeof SALE_STATUSES)[number];
export const SALE_CAPACITIES = ['profile', 'full_account'] as const;
export type SaleCapacity = (typeof SALE_CAPACITIES)[number];

/** A sale = client + plan snapshot + occupied profiles. The heart of the system. */
export const sales = pgTable(
  'app_sales',
  {
    id: uuid('id').primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    code: varchar('code', { length: 12 }).notNull(),
    clientId: uuid('client_id')
      .notNull()
      .references(() => clients.id, { onDelete: 'restrict' }),
    planId: uuid('plan_id')
      .notNull()
      .references(() => plans.id, { onDelete: 'restrict' }),
    agentId: uuid('agent_id')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    /** Denormalized copy of `plan.service_id` for queries. */
    serviceId: uuid('service_id')
      .notNull()
      .references(() => services.id, { onDelete: 'restrict' }),
    // Plan snapshot: the sale never reads these from the plan at runtime.
    capacity: varchar('capacity', { length: 20 }).notNull().$type<SaleCapacity>(),
    durationDays: integer('duration_days').notNull(),
    price: numeric('price', { precision: 10, scale: 2 }).notNull(),
    startDate: date('start_date').notNull(),
    endDate: date('end_date').notNull(),
    status: varchar('status', { length: 20 }).notNull().default('pending').$type<SaleStatus>(),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    approvedBy: uuid('approved_by').references(() => user.id, { onDelete: 'set null' }),
    rejectedAt: timestamp('rejected_at', { withTimezone: true }),
    rejectedBy: uuid('rejected_by').references(() => user.id, { onDelete: 'set null' }),
    rejectionReason: varchar('rejection_reason', { length: 255 }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    cancellationReason: varchar('cancellation_reason', { length: 255 }),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).$onUpdate(() => new Date()),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('app_sales_company_id_code_unique').on(t.companyId, t.code),
    index('app_sales_status_end_date_idx').on(t.status, t.endDate),
    index('app_sales_client_id_idx').on(t.clientId),
    index('app_sales_agent_id_idx').on(t.agentId),
    index('app_sales_service_id_idx').on(t.serviceId),
    check('app_sales_capacity_check', sql`${t.capacity} in ('profile', 'full_account')`),
    check('app_sales_duration_days_check', sql`${t.durationDays} >= 1`),
    check('app_sales_price_check', sql`${t.price} >= 0`),
    check('app_sales_status_check', sql`${t.status} in ('pending', 'active', 'expired', 'cancelled', 'rejected')`),
  ],
);

/** Pivot with its own id: which profiles a sale occupies. */
export const saleProfiles = pgTable(
  'app_sale_profiles',
  {
    id: uuid('id').primaryKey(),
    saleId: uuid('sale_id')
      .notNull()
      .references(() => sales.id, { onDelete: 'cascade' }),
    profileId: uuid('profile_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('app_sale_profiles_sale_id_profile_id_unique').on(t.saleId, t.profileId),
    index('app_sale_profiles_profile_id_idx').on(t.profileId),
  ],
);

/** Immutable renewal / reactivation history. */
export const saleRenewals = pgTable(
  'app_sale_renewals',
  {
    id: uuid('id').primaryKey(),
    saleId: uuid('sale_id')
      .notNull()
      .references(() => sales.id, { onDelete: 'restrict' }),
    renewedAt: date('renewed_at').notNull(),
    previousEndDate: date('previous_end_date').notNull(),
    newEndDate: date('new_end_date').notNull(),
    durationDays: integer('duration_days').notNull(),
    price: numeric('price', { precision: 10, scale: 2 }).notNull(),
    renewedBy: uuid('renewed_by').references(() => user.id, { onDelete: 'set null' }),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('app_sale_renewals_sale_id_idx').on(t.saleId),
    index('app_sale_renewals_previous_end_date_idx').on(t.previousEndDate),
    check('app_sale_renewals_duration_days_check', sql`${t.durationDays} >= 1`),
    check('app_sale_renewals_price_check', sql`${t.price} >= 0`),
  ],
);

export const salesRelations = relations(sales, ({ one, many }) => ({
  company: one(companies, { fields: [sales.companyId], references: [companies.id] }),
  client: one(clients, { fields: [sales.clientId], references: [clients.id] }),
  plan: one(plans, { fields: [sales.planId], references: [plans.id] }),
  service: one(services, { fields: [sales.serviceId], references: [services.id] }),
  agent: one(user, { fields: [sales.agentId], references: [user.id] }),
  saleProfiles: many(saleProfiles),
  renewals: many(saleRenewals),
}));

export const saleProfilesRelations = relations(saleProfiles, ({ one }) => ({
  sale: one(sales, { fields: [saleProfiles.saleId], references: [sales.id] }),
  profile: one(profiles, { fields: [saleProfiles.profileId], references: [profiles.id] }),
}));

export const saleRenewalsRelations = relations(saleRenewals, ({ one }) => ({
  sale: one(sales, { fields: [saleRenewals.saleId], references: [sales.id] }),
  renewedBy: one(user, { fields: [saleRenewals.renewedBy], references: [user.id] }),
}));

export type SaleRow = InferSelectModel<typeof sales>;
export type NewSaleRow = InferInsertModel<typeof sales>;
export type SaleProfileRow = InferSelectModel<typeof saleProfiles>;
export type NewSaleProfileRow = InferInsertModel<typeof saleProfiles>;
export type SaleRenewalRow = InferSelectModel<typeof saleRenewals>;
export type NewSaleRenewalRow = InferInsertModel<typeof saleRenewals>;
