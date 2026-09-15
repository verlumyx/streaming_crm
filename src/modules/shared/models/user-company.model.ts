import { relations, type InferInsertModel, type InferSelectModel } from 'drizzle-orm';
import { boolean, index, pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { user } from '@/db/auth-schema';
import { companies } from '@/modules/company/models/company.model';
import { roles } from '@/modules/role/models/role.model';

export const MEMBERSHIP_STATUSES = ['active', 'inactive'] as const;
export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];

/** User ↔ company membership. The role is per company; activation of a user lives here, not on `users`. */
export const userCompanies = pgTable(
  'user_company',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    roleId: uuid('role_id').references(() => roles.id, { onDelete: 'set null' }),
    status: varchar('status', { length: 55 }).notNull().default('active').$type<MembershipStatus>(),
    isDefault: boolean('is_default').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex('user_company_user_id_company_id_unique').on(t.userId, t.companyId),
    index('user_company_status_idx').on(t.status),
    index('user_company_company_id_idx').on(t.companyId),
  ],
);

export const userCompaniesRelations = relations(userCompanies, ({ one }) => ({
  user: one(user, { fields: [userCompanies.userId], references: [user.id] }),
  company: one(companies, { fields: [userCompanies.companyId], references: [companies.id] }),
  role: one(roles, { fields: [userCompanies.roleId], references: [roles.id] }),
}));

export type UserCompanyRow = InferSelectModel<typeof userCompanies>;
export type NewUserCompanyRow = InferInsertModel<typeof userCompanies>;
