import { relations, type InferInsertModel, type InferSelectModel } from 'drizzle-orm';
import { boolean, index, integer, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

/** Catalogue of modules (seeded from `src/modules/shared/permissions/registry.ts`). Global, not per company. */
export const appModules = pgTable(
  'app_modules',
  {
    id: uuid('id').primaryKey(),
    name: varchar('name', { length: 100 }).notNull().unique(),
    label: varchar('label', { length: 255 }).notNull(),
    description: text('description'),
    icon: varchar('icon', { length: 100 }),
    isActive: boolean('is_active').notNull().default(true),
    order: integer('order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).$onUpdate(() => new Date()),
  },
  (t) => [index('app_modules_is_active_idx').on(t.isActive), index('app_modules_order_idx').on(t.order)],
);

/** Catalogue of permission actions (`users.list`). Roles reference the `action` string. */
export const permissions = pgTable(
  'app_permissions',
  {
    id: uuid('id').primaryKey(),
    moduleId: uuid('module_id')
      .notNull()
      .references(() => appModules.id, { onDelete: 'cascade' }),
    action: varchar('action', { length: 100 }).notNull(),
    label: varchar('label', { length: 255 }).notNull(),
    description: text('description'),
    isActive: boolean('is_active').notNull().default(true),
    order: integer('order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex('app_permissions_module_id_action_unique').on(t.moduleId, t.action),
    index('app_permissions_action_idx').on(t.action),
    index('app_permissions_is_active_idx').on(t.isActive),
  ],
);

export const appModulesRelations = relations(appModules, ({ many }) => ({
  permissions: many(permissions),
}));

export const permissionsRelations = relations(permissions, ({ one }) => ({
  module: one(appModules, { fields: [permissions.moduleId], references: [appModules.id] }),
}));

export type AppModuleRow = InferSelectModel<typeof appModules>;
export type NewAppModuleRow = InferInsertModel<typeof appModules>;
export type PermissionRow = InferSelectModel<typeof permissions>;
export type NewPermissionRow = InferInsertModel<typeof permissions>;
