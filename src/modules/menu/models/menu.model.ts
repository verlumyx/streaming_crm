import { relations, type InferInsertModel, type InferSelectModel } from 'drizzle-orm';
import { boolean, index, integer, pgTable, timestamp, uuid, varchar, type AnyPgColumn } from 'drizzle-orm/pg-core';

export const MENU_SECTIONS = ['main', 'footer'] as const;
export type MenuSection = (typeof MENU_SECTIONS)[number];

/** Reserved pseudo-permission: the entry is visible only to `users.is_system_owner`, regardless of role. */
export const SYSTEM_OWNER_PERMISSION = 'system_owner';

/** Sidebar entries. Global (no company). `url` is relative to the company and prefixed with `/{companyId}` at render time. */
export const menus = pgTable(
  'app_menus',
  {
    id: uuid('id').primaryKey(),
    parentId: uuid('parent_id').references((): AnyPgColumn => menus.id, { onDelete: 'set null' }),
    title: varchar('title', { length: 100 }).notNull(),
    url: varchar('url', { length: 255 }),
    permission: varchar('permission', { length: 100 }),
    icon: varchar('icon', { length: 100 }).notNull(),
    isActive: boolean('is_active').notNull().default(true),
    order: integer('order').notNull().default(0),
    section: varchar('section', { length: 20 }).notNull().default('main').$type<MenuSection>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).$onUpdate(() => new Date()),
  },
  (t) => [
    index('app_menus_parent_id_idx').on(t.parentId),
    index('app_menus_section_idx').on(t.section),
    index('app_menus_is_active_idx').on(t.isActive),
    index('app_menus_order_idx').on(t.order),
  ],
);

export const menusRelations = relations(menus, ({ one, many }) => ({
  parent: one(menus, { fields: [menus.parentId], references: [menus.id], relationName: 'menu_children' }),
  children: many(menus, { relationName: 'menu_children' }),
}));

export type MenuRow = InferSelectModel<typeof menus>;
export type NewMenuRow = InferInsertModel<typeof menus>;
