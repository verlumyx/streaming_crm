import { relations, sql, type InferInsertModel, type InferSelectModel } from 'drizzle-orm';
import { boolean, check, index, integer, numeric, pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { companies } from '@/modules/company/models/company.model';
import { services } from '@/modules/service/models/service.model';

export const PLAN_CODE_PREFIX = 'PLA';
export const PLAN_CAPACITIES = ['profile', 'full_account'] as const;
export type PlanCapacity = (typeof PLAN_CAPACITIES)[number];

export const plans = pgTable(
  'app_plans',
  {
    id: uuid('id').primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    code: varchar('code', { length: 12 }).notNull(),
    serviceId: uuid('service_id')
      .notNull()
      .references(() => services.id, { onDelete: 'restrict' }),
    name: varchar('name', { length: 150 }).notNull(),
    capacity: varchar('capacity', { length: 20 }).notNull().$type<PlanCapacity>(),
    durationDays: integer('duration_days').notNull(),
    salePrice: numeric('sale_price', { precision: 10, scale: 2 }).notNull(),
    roiTargetPct: numeric('roi_target_pct', { precision: 5, scale: 2 }).notNull(),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex('app_plans_company_id_code_unique').on(t.companyId, t.code),
    index('app_plans_service_id_idx').on(t.serviceId),
    index('app_plans_name_idx').on(t.name),
    index('app_plans_active_idx').on(t.active),
    check('app_plans_capacity_check', sql`${t.capacity} in ('profile', 'full_account')`),
    check('app_plans_duration_days_check', sql`${t.durationDays} >= 1`),
    check('app_plans_sale_price_check', sql`${t.salePrice} >= 0`),
    check('app_plans_roi_target_pct_check', sql`${t.roiTargetPct} >= 0`),
  ],
);

export const plansRelations = relations(plans, ({ one }) => ({
  company: one(companies, { fields: [plans.companyId], references: [companies.id] }),
  service: one(services, { fields: [plans.serviceId], references: [services.id] }),
}));

export type PlanRow = InferSelectModel<typeof plans>;
export type NewPlanRow = InferInsertModel<typeof plans>;
