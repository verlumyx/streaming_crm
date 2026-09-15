import { relations, type InferInsertModel, type InferSelectModel } from 'drizzle-orm';
import { index, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { userCompanies } from '@/modules/shared/models/user-company.model';
import { roles } from '@/modules/role/models/role.model';

export const COMPANY_STATUSES = ['active', 'inactive'] as const;
export type CompanyStatus = (typeof COMPANY_STATUSES)[number];

export const companies = pgTable(
  'app_companies',
  {
    id: uuid('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull().unique(),
    status: varchar('status', { length: 20 }).notNull().default('active').$type<CompanyStatus>(),
    address: varchar('address', { length: 500 }),
    description: text('description'),
    phone: varchar('phone', { length: 20 }),
    createdBy: uuid('created_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).$onUpdate(() => new Date()),
  },
  (t) => [
    index('app_companies_status_idx').on(t.status),
    index('app_companies_created_by_idx').on(t.createdBy),
    index('app_companies_created_at_idx').on(t.createdAt),
  ],
);

export const companiesRelations = relations(companies, ({ many }) => ({
  members: many(userCompanies),
  roles: many(roles),
}));

export type CompanyRow = InferSelectModel<typeof companies>;
export type NewCompanyRow = InferInsertModel<typeof companies>;
