import { relations, sql, type InferInsertModel, type InferSelectModel } from 'drizzle-orm';
import { boolean, check, index, integer, pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { companies } from '@/modules/company/models/company.model';
import { plans } from '@/modules/plan/models/plan.model';
import { accounts } from '@/modules/account/models/account.model';

export const SERVICE_CODE_PREFIX = 'SER';

/** Streaming platform (Netflix, Disney+…). Every new company gets the default catalogue seeded. */
export const services = pgTable(
  'app_services',
  {
    id: uuid('id').primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    code: varchar('code', { length: 12 }).notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    logoUrl: varchar('logo_url', { length: 255 }),
    maxProfiles: integer('max_profiles').notNull(),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex('app_services_company_id_code_unique').on(t.companyId, t.code),
    uniqueIndex('app_services_company_id_name_unique').on(t.companyId, t.name),
    index('app_services_active_idx').on(t.active),
    check('app_services_max_profiles_check', sql`${t.maxProfiles} >= 1`),
  ],
);

export const servicesRelations = relations(services, ({ one, many }) => ({
  company: one(companies, { fields: [services.companyId], references: [companies.id] }),
  plans: many(plans),
  accounts: many(accounts),
}));

export type ServiceRow = InferSelectModel<typeof services>;
export type NewServiceRow = InferInsertModel<typeof services>;
