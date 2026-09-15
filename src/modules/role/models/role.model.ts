import { relations, type InferInsertModel, type InferSelectModel } from 'drizzle-orm';
import { index, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { companies } from '@/modules/company/models/company.model';

export const ROLE_STATUSES = ['active', 'inactive'] as const;
export type RoleStatus = (typeof ROLE_STATUSES)[number];

export const PERMISSION_TYPES = ['all', 'custom'] as const;
export type PermissionType = (typeof PERMISSION_TYPES)[number];

/** The role that every company gets on creation; it cannot be edited or deactivated. */
export const ADMINISTRATOR_ROLE_NAME = 'Administrador';

export const roles = pgTable(
  'app_roles',
  {
    id: uuid('id').primaryKey(),
    companyId: uuid('company_id').references(() => companies.id, { onDelete: 'set null' }),
    name: varchar('name', { length: 255 }).notNull(),
    status: varchar('status', { length: 55 }).notNull().default('active').$type<RoleStatus>(),
    description: text('description'),
    permissionType: varchar('permission_type', { length: 10 }).notNull().default('custom').$type<PermissionType>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex('app_roles_name_company_id_unique').on(t.name, t.companyId),
    index('app_roles_status_idx').on(t.status),
    index('app_roles_company_id_idx').on(t.companyId),
  ],
);

/** Stores the permission ACTION string (`users.list`), not a permission id. */
export const rolePermissions = pgTable(
  'app_role_permissions',
  {
    id: uuid('id').primaryKey(),
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    permission: varchar('permission', { length: 100 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('app_role_permissions_role_id_permission_unique').on(t.roleId, t.permission),
    index('app_role_permissions_permission_idx').on(t.permission),
  ],
);

export const rolesRelations = relations(roles, ({ one, many }) => ({
  company: one(companies, { fields: [roles.companyId], references: [companies.id] }),
  permissions: many(rolePermissions),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, { fields: [rolePermissions.roleId], references: [roles.id] }),
}));

export type RoleRow = InferSelectModel<typeof roles>;
export type NewRoleRow = InferInsertModel<typeof roles>;
export type RolePermissionRow = InferSelectModel<typeof rolePermissions>;
