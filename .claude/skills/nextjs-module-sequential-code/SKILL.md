---
name: nextjs-module-sequential-code
description: "Guide for adding an auto-generated, human-readable sequential code (e.g. CLI000001) to a Next.js module. The code has a module prefix + zero-padded counter, is generated in the Drizzle repository inside the Server Action's transaction, and is unique PER COMPANY (each company has its own sequence). Activates when adding a code/folio/correlative field, a per-company sequential identifier, or a prefixed counter to any module."
license: MIT
metadata:
  author: project
---

# Next.js Module — Sequential Code (per company)

Some entities need a short, human-readable identifier alongside their UUID — e.g. `CLI000001`, `CLI000002`. This skill describes how to add an **auto-generated, per-company sequential `code`** to a module.

Reference implementation: the **Client** module (`src/modules/client`), prefix `CLI`.

## Rules (read first)

1. **Format:** `{PREFIX}` + the counter zero-padded to **6 digits** → `CLI000001`. The prefix is a 3-letter uppercase module abbreviation exported as a constant from the model file.
2. **Server-generated.** The `code` is NEVER sent by the client and NEVER part of the Zod schema or the Command. It is created in the Repository. (This is the one exception to the rule "the client always sends the id".)
3. **Unique per company, not global.** Two companies each have their own `CLI000001`. The sequence is scoped by `company_id`. Uniqueness is enforced with a **composite** unique index `(company_id, code)`.
4. **Atomic generation.** Generate inside the transaction the Server Action already opened (`db.transaction(async (tx) => createClientContainer(tx)...)`) using `.for('update')`, so concurrent creates don't collide.
5. The module must already follow the architecture (`companyId` column + `companyId` flowing page/action → Command → Repository via the `[companyId]` URL segment). If it isn't, add that first — see `nextjs-module-repositories` (Company Scoping section).

---

## 1. Migration

Add the column and the composite unique index to the **model** (never hand-write schema SQL), then generate the migration:

```ts
// src/modules/client/models/client.model.ts
import { index, pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

export const clients = pgTable(
  'app_clients',
  {
    id: uuid('id').primaryKey(),
    companyId: uuid('company_id').notNull(),
    code: varchar('code', { length: 12 }).notNull(),
    // ...other columns
  },
  (t) => [
    index('app_clients_company_id_idx').on(t.companyId),
    uniqueIndex('app_clients_company_code_unique').on(t.companyId, t.code),
  ],
);
```

```bash
pnpm db:generate   # drizzle-kit generate → drizzle/000N_*.sql with ALTER TABLE ... ADD COLUMN + CREATE UNIQUE INDEX
pnpm db:migrate
```

### Backfill of existing rows

If `app_clients` already has rows, `NOT NULL` + unique cannot be applied in one step. Do it in three:

1. Add `code` as nullable (`varchar('code', { length: 12 })`), `pnpm db:generate`.
2. Create a **custom** migration for the data backfill — this is the only place raw SQL is allowed:

```bash
pnpm drizzle-kit generate --custom --name backfill_client_codes
```

```sql
-- drizzle/000N_backfill_client_codes.sql
-- Number existing rows sequentially WITHIN each company, in a deterministic order.
UPDATE app_clients AS c
SET code = 'CLI' || lpad(n.rn::text, 6, '0')
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY company_id ORDER BY created_at, id) AS rn
  FROM app_clients
) AS n
WHERE c.id = n.id AND c.code IS NULL;
```

3. Switch the column to `.notNull()`, add the `uniqueIndex`, `pnpm db:generate` again, then `pnpm db:migrate`.

On a fresh table (no rows) do everything in one generate.

---

## 2. Model

Export the prefix from the model file so the repository, the factory and tests share one source of truth:

```ts
// src/modules/client/models/client.model.ts
export const CLIENT_CODE_PREFIX = 'CLI';
export const CLIENT_CODE_WIDTH = 6;
```

`ClientRow` now includes `code: string` automatically (it is inferred from the table).

---

## 3. Repository — generation

The repository receives a `DbExecutor`. In a Server Action that executor **is the `tx`** opened by `db.transaction(...)`, so every statement issued by `generateNextCode` runs in the same transaction as the `insert`, and the row lock is held until commit. Lexicographic order equals numeric order because the width is fixed (6 digits).

```ts
// src/modules/client/repositories/drizzle-client.repository.ts
import { and, desc, eq, like } from 'drizzle-orm';
import { clients, CLIENT_CODE_PREFIX, CLIENT_CODE_WIDTH } from '../models/client.model';

export class DrizzleClientRepository implements ClientRepository {
  constructor(private readonly db: DbExecutor) {}

  async create(command: CreateClientCommand): Promise<void> {
    const code = await this.generateNextCode(command.companyId);

    await this.db.insert(clients).values({
      id: command.id,
      companyId: command.companyId,
      code,
      name: command.name,
      status: 'active',
    });
  }

  private async generateNextCode(companyId: string): Promise<string> {
    const scope = and(eq(clients.companyId, companyId), like(clients.code, `${CLIENT_CODE_PREFIX}%`));

    // 1. Queue behind any concurrent create for this company: FOR UPDATE blocks until the
    //    other transaction commits or rolls back. The lock is released with OUR commit.
    await this.db
      .select({ id: clients.id })
      .from(clients)
      .where(scope)
      .orderBy(desc(clients.code))
      .limit(1)
      .for('update');

    // 2. Re-read once the lock is ours. A new statement takes a fresh snapshot, so it sees
    //    the code committed by the transaction we were waiting on.
    const [last] = await this.db
      .select({ code: clients.code })
      .from(clients)
      .where(scope)
      .orderBy(desc(clients.code))
      .limit(1);

    const next = last ? Number(last.code.slice(CLIENT_CODE_PREFIX.length)) + 1 : 1;
    return `${CLIENT_CODE_PREFIX}${String(next).padStart(CLIENT_CODE_WIDTH, '0')}`;
  }
}
```

Why this is safe under concurrency:

- Two actions creating clients for the same company run in two transactions. Both lock the current last row; the second one blocks in step 1 until the first commits, then reads the freshly committed code in step 2 and produces `+1`.
- The only window not covered by the row lock is the **very first record of a company** (no row exists to lock). There, and for any other unforeseen race, the composite unique index `(company_id, code)` is the safety net: the insert fails, the action's transaction rolls back, `toActionError` is not reached (it is a database error, not a `DomainError`) and the request errors out instead of persisting a duplicate.
- Never call `generateNextCode` outside the transaction (e.g. from a page or with the global `db`) — the lock would be released immediately.

Make `code` searchable by adding it to the filter map (`keys == SearchClientCommand.filters keys`):

```ts
// src/modules/client/repositories/client.filters.ts
export const clientFilters = {
  search: (value) => ilike(clients.name, `%${value}%`),
  code: (value) => ilike(clients.code, `%${value}%`),
  status: (value) => eq(clients.status, value),
} satisfies FilterMap;
```

Add `code: z.string().optional()` to `searchClientSchema` so the page can forward it.

---

## 4. Command — carry companyId, NOT code

The `code` is not part of the Command. The `companyId` comes from the `[companyId]` URL segment: the action receives it as a bound argument and passes it to `fromInput(input, companyId)`. It is never read from `FormData`, cookies or the session.

```ts
// src/modules/client/commands/create-client.command.ts
export class CreateClientCommand {
  constructor(
    readonly id: string,
    readonly companyId: string,
    readonly name: string,
    // ...
  ) {}

  static fromInput(input: CreateClientInput, companyId: string): CreateClientCommand {
    return new CreateClientCommand(input.id, companyId, input.name);
  }
}
```

```ts
// src/app/[companyId]/clients/actions.ts — inside createClientAction(companyId, _prev, formData)
await db.transaction(async (tx) => {
  await createClientContainer(tx).createService.execute(CreateClientCommand.fromInput(parsed.data, companyId));
});
```

`createClientSchema` has no `code` field; if a `code` key arrives in the form it is ignored.

---

## 5. Serializer — expose it

```ts
export type ClientDto = {
  id: string;
  code: string;
  name: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string | null;
};

export function toClientDto(row: ClientRow): ClientDto {
  return { id: row.id, code: row.code, name: row.name, status: row.status, /* ... */ };
}
```

---

## 6. Factory

The factory bypasses the repository, so it must produce a unique `code` itself. Keep a **per-company counter** in module scope (any company-unique value works, since uniqueness is per company):

```ts
// tests/factories/client.factory.ts
import { faker } from '@faker-js/faker';
import type { DbExecutor } from '@/modules/shared/infrastructure/db-executor';
import { uuidv7 } from '@/modules/shared/uuid';
import {
  clients,
  CLIENT_CODE_PREFIX,
  CLIENT_CODE_WIDTH,
  type ClientRow,
  type NewClientRow,
} from '@/modules/client/models/client.model';

const sequences = new Map<string, number>();

export function nextClientCode(companyId: string): string {
  const next = (sequences.get(companyId) ?? 0) + 1;
  sequences.set(companyId, next);
  return `${CLIENT_CODE_PREFIX}${String(next).padStart(CLIENT_CODE_WIDTH, '0')}`; // CLI000001, CLI000002...
}

export function buildClient(overrides: Partial<NewClientRow> = {}): NewClientRow {
  const companyId = overrides.companyId ?? uuidv7();
  return {
    id: uuidv7(),
    companyId,
    code: nextClientCode(companyId),
    name: faker.company.name(),
    status: 'active',
    ...overrides,
  };
}

export async function createClient(db: DbExecutor, overrides: Partial<NewClientRow> = {}): Promise<ClientRow> {
  const [row] = await db.insert(clients).values(buildClient(overrides)).returning();
  return row;
}
```

Factory rows used by integration tests must belong to the acting company: `createClient(db, { companyId })` — otherwise per-company scoping hides them.

---

## 7. Frontend

- **DTO type**: `ClientDto` gets `code: string` (from the serializer — `ui/types/` has no entity type).
- **Filters interface** (`ui/types/Client.ts`): add `code?: string;`.
- **List table**: add a "Código" column **first**. Hide it on small screens with `hidden lg:table-cell` on BOTH the `TableHead` and the `TableCell` (`hidden lg:block` breaks table layout — cells must stay `table-cell`). Render with `font-mono tabular-nums font-semibold`.
- **Detail card**: show the code in the header next to the name.
- Add a `code` filter input if the module exposes per-field filters.

```tsx
<TableHeader>
  <TableRow>
    <TableHead className="hidden lg:table-cell">Código</TableHead>
    <TableHead>Nombre</TableHead>
    {/* ... */}
  </TableRow>
</TableHeader>
<TableBody>
  {items.map((client) => (
    <TableRow key={client.id}>
      <TableCell className="hidden lg:table-cell font-mono tabular-nums font-semibold">{client.code}</TableCell>
      <TableCell>{client.name}</TableCell>
      {/* ... */}
    </TableRow>
  ))}
</TableBody>
```

```tsx
// ClientCard.tsx header
<CardHeader>
  <CardTitle className="flex items-center gap-3">
    <span className="font-mono tabular-nums text-muted-foreground">{client.code}</span>
    {client.name}
  </CardTitle>
</CardHeader>
```

---

## 8. Tests

### Integration (Vitest, test database)

```ts
// tests/integration/modules/client/client-sequential-code.test.ts
import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { uuidv7 } from '@/modules/shared/uuid';
import { clients } from '@/modules/client/models/client.model';
import { createClientContainer } from '@/modules/client/container';
import { CreateClientCommand } from '@/modules/client/commands/create-client.command';
import { SearchClientCommand } from '@/modules/client/commands/search-client.command';
import { createClient } from '../../../factories/client.factory';
import { truncate } from '../../helpers/truncate';

const create = (companyId: string, name: string) =>
  db.transaction((tx) => createClientContainer(tx).createService.execute(new CreateClientCommand(uuidv7(), companyId, name)));

describe('Client sequential code', () => {
  beforeEach(() => truncate(clients));

  it('starts at 000001 and increments', async () => {
    const companyId = uuidv7();
    expect((await create(companyId, 'A')).code).toBe('CLI000001');
    expect((await create(companyId, 'B')).code).toBe('CLI000002');
  });

  it('keeps an independent sequence per company', async () => {
    expect((await create(uuidv7(), 'A')).code).toBe('CLI000001');
    expect((await create(uuidv7(), 'B')).code).toBe('CLI000001');
  });

  it('assigns distinct codes to concurrent creates', async () => {
    const companyId = uuidv7();
    await createClient(db, { companyId, code: 'CLI000001' }); // seed: gives the lock a row to wait on

    const rows = await Promise.all([1, 2, 3, 4, 5].map((n) => create(companyId, `Cliente ${n}`)));

    const codes = rows.map((r) => r.code).sort();
    expect(new Set(codes).size).toBe(5);
    expect(codes).toEqual(['CLI000002', 'CLI000003', 'CLI000004', 'CLI000005', 'CLI000006']);
  });

  it('can be searched by code', async () => {
    const companyId = uuidv7();
    await createClient(db, { companyId, code: 'CLI000042' });
    const { data } = await createClientContainer(db).searchService.execute(
      new SearchClientCommand({ filters: { code: '000042' }, companyId }),
    );
    expect(data).toHaveLength(1);
    expect(data[0].code).toBe('CLI000042');
  });
});
```

### Unit (fake repository)

The in-memory fake mirrors the repository contract: it assigns codes sequentially per company in `create()`.

```ts
// tests/unit/modules/client/fake-client.repository.ts (excerpt)
async create(command: CreateClientCommand): Promise<void> {
  const count = this.rows.filter((r) => r.companyId === command.companyId).length;
  this.rows.push({ ...buildClient({ id: command.id, companyId: command.companyId, name: command.name }),
    code: `CLI${String(count + 1).padStart(6, '0')}`, createdAt: new Date(), updatedAt: null });
}
```

```ts
it('assigns the next code on create', async () => {
  const repository = new FakeClientRepository();
  const service = new ClientCreateService(repository);
  await service.execute(new CreateClientCommand(uuidv7(), 'company-1', 'A'));
  const second = await service.execute(new CreateClientCommand(uuidv7(), 'company-1', 'B'));
  expect(second.code).toBe('CLI000002');
});
```

---

## Checklist

- [ ] Model: `code: varchar('code', { length: 12 }).notNull()` + `uniqueIndex('app_{module_names}_company_code_unique').on(t.companyId, t.code)`.
- [ ] Migration generated with `pnpm db:generate`; custom SQL backfill (`ROW_NUMBER() OVER (PARTITION BY company_id ...)`) if the table had rows.
- [ ] Model exports `{MODULE}_CODE_PREFIX` (3 uppercase letters).
- [ ] Repository: `generateNextCode()` with `.for('update')` on the injected `DbExecutor` (the action's `tx`), scoped by company; `code` filter in the filter map.
- [ ] Command carries `companyId` (from the URL segment via `fromInput(input, companyId)`), never `code`. No `code` in the Zod schema.
- [ ] Serializer exposes `code`.
- [ ] Factory generates a unique per-company `code`.
- [ ] UI: `code` first column (`hidden lg:table-cell font-mono tabular-nums font-semibold`), shown in the detail card header, `code?` in `ClientFilters`.
- [ ] Tests: sequence, per-company isolation, concurrent creates, search-by-code (integration); fake repository assigns codes (unit).
