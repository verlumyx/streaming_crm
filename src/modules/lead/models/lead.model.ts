import { sql, type InferInsertModel, type InferSelectModel } from 'drizzle-orm';
import { check, index, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const LEAD_STATUSES = ['pending', 'reviewed'] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

/** Public contact-form submissions. Global (no company). */
export const leads = pgTable(
  'app_leads',
  {
    id: uuid('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 30 }).notNull(),
    status: varchar('status', { length: 20 }).notNull().default('pending').$type<LeadStatus>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).$onUpdate(() => new Date()),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    index('app_leads_status_idx').on(t.status),
    index('app_leads_created_at_idx').on(t.createdAt),
    check('app_leads_status_check', sql`${t.status} in ('pending', 'reviewed')`),
  ],
);

export type LeadRow = InferSelectModel<typeof leads>;
export type NewLeadRow = InferInsertModel<typeof leads>;
