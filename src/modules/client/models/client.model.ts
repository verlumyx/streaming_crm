import { relations, type InferInsertModel, type InferSelectModel } from 'drizzle-orm';
import { index, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { user } from '@/db/auth-schema';
import { companies } from '@/modules/company/models/company.model';
import { sales } from '@/modules/sale/models/sale.model';

export const CLIENT_CODE_PREFIX = 'CLI';
export const CLIENT_STATUSES = ['active', 'inactive'] as const;
export type ClientStatus = (typeof CLIENT_STATUSES)[number];

export const clients = pgTable(
  'app_clients',
  {
    id: uuid('id').primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    code: varchar('code', { length: 12 }).notNull(),
    name: varchar('name', { length: 150 }).notNull(),
    phone: varchar('phone', { length: 30 }),
    /** Best-effort E.164 form of `phone`, derived on write. Lets an inbound WhatsApp/Telegram
     *  contact be matched to a client. Not unique: legacy rows may collide. */
    phoneE164: varchar('phone_e164', { length: 20 }),
    email: varchar('email', { length: 255 }),
    status: varchar('status', { length: 20 }).notNull().default('active').$type<ClientStatus>(),
    notes: text('notes'),
    createdBy: uuid('created_by').references(() => user.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex('app_clients_company_id_code_unique').on(t.companyId, t.code),
    uniqueIndex('app_clients_company_id_email_unique').on(t.companyId, t.email),
    index('app_clients_name_idx').on(t.name),
    index('app_clients_company_id_phone_e164_idx').on(t.companyId, t.phoneE164),
    index('app_clients_status_idx').on(t.status),
    index('app_clients_created_at_idx').on(t.createdAt),
  ],
);

export const clientsRelations = relations(clients, ({ one, many }) => ({
  company: one(companies, { fields: [clients.companyId], references: [companies.id] }),
  creator: one(user, { fields: [clients.createdBy], references: [user.id] }),
  sales: many(sales),
}));

export type ClientRow = InferSelectModel<typeof clients>;
export type NewClientRow = InferInsertModel<typeof clients>;
