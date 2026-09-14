---
name: nextjs-module-models
description: "Guide for creating Drizzle table models in the modular Next.js architecture. Activates when creating or modifying *.model.ts files inside any module's models/ folder, the src/db/schema.ts barrel, drizzle-kit migrations, or test factories under tests/factories/. Models use UUID v7 as primary key."
license: MIT
metadata:
  author: project
---

# Next.js Module — Models

Models define the Drizzle table, its relations and its row types. They contain **no business logic**.

## Location

```
src/modules/{module-name}/models/
└── {module-name}.model.ts          pgTable + relations + Row types

src/db/schema.ts                    barrel: re-exports every module model
tests/factories/{module-name}.factory.ts
```

Every model is re-exported from `src/db/schema.ts`. `drizzle-kit` and the relational query API (`db.query.*`) only see what is exported there.

## UUID v7 — Primary Key

All models use **UUID v7** as the primary key. UUID v7 is time-ordered, which means records sort correctly by ID without needing an additional `created_at` sort. This is critical for performance and predictability.

### Why UUID v7 over UUID v4?
- UUID v4 is random — index fragmentation, poor sort order.
- UUID v7 is time-ordered — monotonically increasing, works as a natural sort key.
- UUID v7 over ULID: broader standard support, valid UUID format.

### Implementation

The `id` column is `uuid('id').primaryKey()` with **no database default**. The client generates the UUID v7 and sends it in the form; the create schema requires it (see `nextjs-module-validation`) and the Create command carries it as its first field. The server never generates the id of a main entity.

Rows that are only ever created server-side (pivot rows, renewals, history entries) use `$defaultFn(uuidv7)` from `@/modules/shared/uuid`:

```ts
import { uuidv7 } from '@/modules/shared/uuid';

// server-created rows only (pivots, renewals, history)
id: uuid('id').primaryKey().$defaultFn(uuidv7),
```

---

## Full Model Template

```ts
// src/modules/client/models/client.model.ts
import { type InferInsertModel, type InferSelectModel } from 'drizzle-orm';
import { index, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const clients = pgTable(
  'app_clients',
  {
    id: uuid('id').primaryKey(), // sent by the client (UUID v7) — no DB default
    companyId: uuid('company_id').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    status: varchar('status', { length: 50 })
      .notNull()
      .default('active')
      .$type<'active' | 'inactive'>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index('app_clients_company_id_idx').on(t.companyId),
    index('app_clients_company_id_status_idx').on(t.companyId, t.status),
  ],
);

export type ClientRow = InferSelectModel<typeof clients>;
export type NewClientRow = InferInsertModel<typeof clients>;
```

Column conventions:

- Column names are explicit `snake_case` strings; object keys are `camelCase`. Never rely on the implicit name.
- `status` is a `varchar(50)` narrowed with `$type<'active' | 'inactive'>()` — **never `pgEnum`**. Adding a status is then a code change, not an `ALTER TYPE` migration.
- Timestamps are always `timestamp(..., { withTimezone: true })`. `createdAt` is `notNull().defaultNow()`; `updatedAt` is `defaultNow().$onUpdate(() => new Date())` so the ORM refreshes it on every `update()`.
- Money is `numeric('amount', { precision: 12, scale: 2 })`; free text is `text()`; flags are `boolean()`; structured data is `jsonb().$type<Shape>()`.
- `ClientRow` / `NewClientRow` are the **only** types other layers import from the model. Repositories return `ClientRow`; serializers receive it.

---

## Migration — drizzle-kit

Migrations are generated from the model diff, never written by hand:

```bash
pnpm db:generate   # drizzle-kit generate → drizzle/000N_*.sql from the diff of src/db/schema.ts
pnpm db:migrate    # drizzle-kit migrate  → applies pending migrations (also run in CI and before tests)
```

Generated SQL for the template above:

```sql
CREATE TABLE "app_clients" (
  "id" uuid PRIMARY KEY NOT NULL,
  "company_id" uuid NOT NULL,
  "name" varchar(255) NOT NULL,
  "status" varchar(50) DEFAULT 'active' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now()
);
CREATE INDEX "app_clients_company_id_idx" ON "app_clients" ("company_id");
CREATE INDEX "app_clients_company_id_status_idx" ON "app_clients" ("company_id", "status");
```

- The model is not visible to `drizzle-kit` until it is re-exported from `src/db/schema.ts` — do that **before** `pnpm db:generate`.
- Hand-written SQL is allowed **only for data backfills** (`pnpm drizzle-kit generate --custom` creates an empty migration to fill in). Schema changes always go through the model.
- Never edit a generated migration after it has been applied; generate a new one.

---

## Factory

Every model has a factory in `tests/factories/`. `buildClient` returns an insertable row (no database); `createClient` inserts it through the given `DbExecutor` and returns the persisted row.

```ts
// tests/factories/client.factory.ts
import { faker } from '@faker-js/faker';
import type { DbExecutor } from '@/modules/shared/infrastructure/db-executor';
import { uuidv7 } from '@/modules/shared/uuid';
import { clients, type ClientRow, type NewClientRow } from '@/modules/client/models/client.model';

export function buildClient(overrides: Partial<NewClientRow> = {}): NewClientRow {
  return {
    id: uuidv7(),
    companyId: uuidv7(),
    name: faker.company.name(),
    status: 'active',
    ...overrides,
  };
}

export function buildInactiveClient(overrides: Partial<NewClientRow> = {}): NewClientRow {
  return buildClient({ status: 'inactive', ...overrides });
}

export async function createClient(db: DbExecutor, overrides: Partial<NewClientRow> = {}): Promise<ClientRow> {
  const [row] = await db.insert(clients).values(buildClient(overrides)).returning();
  return row;
}
```

Usage in tests:

```ts
const client = await createClient(db, { companyId });                       // active
const inactive = await createClient(db, buildInactiveClient({ companyId })); // inactive variant
const draft = buildClient({ name: 'Acme' });                                 // no DB (unit tests / fake repos)
```

---

## Relations

Declare relations next to the table with `relations()` and export them from the same file (and, through it, from `src/db/schema.ts`). Foreign keys are explicit in the column definition.

```ts
// src/modules/client/models/client.model.ts
import { relations } from 'drizzle-orm';
import { sales } from '@/modules/sale/models/sale.model';

export const clientsRelations = relations(clients, ({ many }) => ({
  sales: many(sales),
}));
```

```ts
// src/modules/sale/models/sale.model.ts
import { relations } from 'drizzle-orm';
import { clients } from '@/modules/client/models/client.model';

export const sales = pgTable('app_sales', {
  id: uuid('id').primaryKey(),
  companyId: uuid('company_id').notNull(),
  clientId: uuid('client_id')
    .notNull()
    .references(() => clients.id),
  // ...
});

export const salesRelations = relations(sales, ({ one }) => ({
  client: one(clients, { fields: [sales.clientId], references: [clients.id] }),
}));
```

Relations exist so repositories can use `db.query.clients.findMany({ with: { sales: true } })`. Whether a relation is loaded is a repository decision; the serializer exposes it only when the repository joined it (see `nextjs-module-serializers`).

---

## Rules

1. **No business logic** in the model — only the table, its relations and its row types. Rules that decide something (`isInGracePeriod`, `canBeRenewed`) live in the Service layer or a pure `domain/` function.
2. `id` is always `uuid('id').primaryKey()` with **no default**; `$defaultFn(uuidv7)` only for rows created server-side (pivots, renewals, history).
3. Every model has a factory in `tests/factories/{module-name}.factory.ts` with `build{Module}`, `create{Module}` and an inactive variant.
4. Every model is re-exported from `src/db/schema.ts`. Not exported = no migration, no relational queries.
5. Table name is explicit, `snake_case` plural, with the **`app_` prefix** (`app_clients`). The prefix separates application tables from the auth tables `user`, `session`, `organization`, `member`, which are owned by better-auth and never modified by modules.
6. Every company-scoped table has `companyId: uuid('company_id').notNull()` and an index on it.
7. Indexes and unique constraints are declared in the **third `pgTable` argument**, named `{table}_{columns}_idx` / `{table}_{columns}_unique`.
8. Timestamps always use `{ withTimezone: true }`.
9. `status` is `varchar(50)` narrowed with `$type<...>()`, never `pgEnum`.
10. Export `{Module}Row` (`InferSelectModel`) and `New{Module}Row` (`InferInsertModel`). Other layers never redeclare these shapes.
11. Schema changes go through `pnpm db:generate` + `pnpm db:migrate`; hand-written SQL only for data backfills.
