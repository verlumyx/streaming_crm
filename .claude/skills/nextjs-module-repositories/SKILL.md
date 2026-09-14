---
name: nextjs-module-repositories
description: "Guide for creating the repository interface, the filter map and the Drizzle repository implementation in the modular Next.js architecture. Activates when creating or modifying files inside any module's src/modules/{module-name}/repositories/ folder ({module-name}.repository.ts, {module-name}.filters.ts, drizzle-{module-name}.repository.ts) or wiring them in container.ts."
license: MIT
metadata:
  author: project
---

# Next.js Module — Repositories

The Repository is the **single point of access to the database**. Services never touch Drizzle directly — they always go through the repository interface.

## Location

```
src/modules/{module-name}/repositories/
├── {module-name}.repository.ts            ← interface (the contract)
├── {module-name}.filters.ts               ← filter map (criteria pattern)
└── drizzle-{module-name}.repository.ts    ← implementation, receives a DbExecutor
```

For the `Client` module: `client.repository.ts`, `client.filters.ts`, `drizzle-client.repository.ts`.

## Rules

1. The interface defines the contract — Services depend on the interface, never on the concrete class.
2. The concrete repository **composes** the filter map through `applyFilters()` — there is no inheritance between the filter map and the repository.
3. Never put business logic in a repository — only data access.
4. Always query through the **injected `DbExecutor`** (`this.db`). **NEVER import the global `db` from `@/db/client` inside a repository** — the container decides whether the repository runs against `db` or a transaction `tx`.
5. Raw ``sql`...` `` is allowed only for aggregates and expressions with no Drizzle operator (`coalesce(sum(...))`, `date_trunc`). Everything else uses the typed operators from `drizzle-orm` (`eq`, `and`, `ilike`, `desc`, `count`, `exists`, `isNull`).
6. `search()` calls `applyFilters(clientFilters, command.filters)` — never iterate the filters object manually.
7. Filter map keys **must match** the keys of `SearchClientCommand.filters` exactly.
8. The wiring between the interface and the implementation happens in the module's `container.ts`.
9. **Company scoping comes from the Command, NEVER from `cookies()`, `headers()` or the auth session.** A repository must not call `getSessionUser()`, `headers()`, `cookies()` or `auth`. The active company is resolved from the `[companyId]` URL segment in the page/action and passed in through the Command — see below.
10. `findOrFail()` is the one documented exception to "only services throw": it throws `{Module}NotFoundException` so every caller gets the same error.

---

## Company Scoping (multi-tenant)

Every module lives under the `/[companyId]/...` URL prefix, so every listing and every lookup must be scoped to the active company. The company id flows **page/action → Command → Repository**. The repository stays pure and testable — it receives the id, it never fetches it.

❌ **Wrong — the repository reaches into the request:**

```ts
// drizzle-client.repository.ts
import { headers } from 'next/headers';                                   // ← never in a repository
import { getSessionUser } from '@/modules/shared/auth/require-permission'; // ← never in a repository

async search(command: SearchClientCommand) {
  const user = await getSessionUser();
  const companyId = (await headers()).get('x-company-id');
  // ...
}
```

✅ **Correct — the Command carries `companyId` (required, not optional):**

```ts
// commands/search-client.command.ts
export class SearchClientCommand {
  readonly filters: Record<string, string | undefined>;
  readonly limit: number;
  readonly offset: number;
  readonly companyId: string; // REQUIRED

  constructor(params: {
    filters?: Record<string, string | undefined>;
    limit?: number;
    offset?: number;
    companyId: string;
  }) {
    this.filters = params.filters ?? {};
    this.limit = params.limit ?? 20;
    this.offset = params.offset ?? 0;
    this.companyId = params.companyId;
  }
}
```

```ts
// drizzle-client.repository.ts — read it from the command
async search(command: SearchClientCommand): Promise<{ data: ClientRow[]; total: number }> {
  const where = and(
    eq(clients.companyId, command.companyId),
    ...applyFilters(clientFilters, command.filters),
  );
  // ... count, page
}
```

```tsx
// src/app/[companyId]/clients/page.tsx — pass the URL segment into the command
const { companyId } = await params;
await guardPage(companyId, 'clients.list');

const filters = searchClientSchema.parse(await searchParams);
const command = new SearchClientCommand({
  filters: { search: filters.search, status: filters.status },
  limit: filters.limit,
  offset: filters.offset,
  companyId,
});
```

Lookups by id are scoped the same way: `findById(id, companyId)` and `findOrFail(id, companyId)` **always** take `companyId`. A row that belongs to another company is simply "not found".

**Many-to-many ownership** (e.g. users belong to companies through the pivot table `app_company_users`, no `company_id` column on `app_users`): scope with an `exists()` subquery instead of a join, so the result set is never duplicated:

```ts
import { and, eq, exists, sql } from 'drizzle-orm';
import { users } from '../models/user.model';
import { companyUsers } from '@/modules/company/models/company-user.model';

const where = and(
  exists(
    this.db
      .select({ one: sql`1` })
      .from(companyUsers)
      .where(and(eq(companyUsers.userId, users.id), eq(companyUsers.companyId, command.companyId))),
  ),
  ...applyFilters(userFilters, command.filters),
);
```

**Non-search methods that also need scoping** (e.g. `getActive()`): accept the company id as an explicit parameter — `getActive(companyId: string)` — and have the page/action pass it. Same rule: no `headers()`/`cookies()`/session access inside the repository.

```ts
async getActive(companyId: string): Promise<ClientRow[]> {
  return this.db
    .select()
    .from(clients)
    .where(and(eq(clients.companyId, companyId), eq(clients.status, 'active')))
    .orderBy(desc(clients.createdAt));
}
```

---

## Shared helper: drizzle-query-filters.ts

Located at `src/modules/shared/infrastructure/drizzle-query-filters.ts`. Do not reimplement it inside a module.

`applyFilters()` iterates the filters object, skips empty values (`null`, `undefined`, `''`), and calls the builder whose key matches each filter key. It returns an array of `SQL` conditions ready to be spread into `and(...)`.

```ts
import type { SQL } from 'drizzle-orm';

export type FilterMap = Record<string, (value: string) => SQL>;

export function applyFilters(map: FilterMap, filters: Record<string, unknown>): SQL[] {
  const conditions: SQL[] = [];

  for (const [key, value] of Object.entries(filters)) {
    if (value === null || value === undefined || value === '') continue;
    const build = map[key];
    if (build) conditions.push(build(String(value)));
  }

  return conditions;
}
```

Keys that have no entry in the map are ignored, so an unknown query-string key can never reach the database.

---

## client.filters.ts

One entry per filterable field. The key **must match** the key used in `SearchClientCommand.filters`.

```ts
// repositories/client.filters.ts
import { eq, ilike } from 'drizzle-orm';
import type { FilterMap } from '@/modules/shared/infrastructure/drizzle-query-filters';
import { clients } from '../models/client.model';

// Keys MUST match the keys of SearchClientCommand.filters
export const clientFilters = {
  search: (value) => ilike(clients.name, `%${value}%`),
  status: (value) => eq(clients.status, value),
} satisfies FilterMap;
```

`satisfies FilterMap` keeps the literal keys (so a typo in the page is a type error when you index the map) while still enforcing the `(value: string) => SQL` shape.

---

## client.repository.ts (interface)

`create()`, `update()` and `updateStatus()` always return `Promise<void>`. The caller (Service) is responsible for fetching the row afterwards via `findOrFail()`.

```ts
// repositories/client.repository.ts
import type { ClientRow } from '../models/client.model';
import type { CreateClientCommand } from '../commands/create-client.command';
import type { UpdateClientCommand } from '../commands/update-client.command';
import type { UpdateStatusClientCommand } from '../commands/update-status-client.command';
import type { SearchClientCommand } from '../commands/search-client.command';

export interface ClientRepository {
  create(command: CreateClientCommand): Promise<void>;

  findById(id: string, companyId: string): Promise<ClientRow | null>;

  /** Throws ClientNotFoundException when the row does not exist in that company. */
  findOrFail(id: string, companyId: string): Promise<ClientRow>;

  update(row: ClientRow, command: UpdateClientCommand): Promise<void>;

  updateStatus(row: ClientRow, command: UpdateStatusClientCommand): Promise<void>;

  search(command: SearchClientCommand): Promise<{ data: ClientRow[]; total: number }>;
}
```

The interface only uses `import type` — it must never pull in `drizzle-orm` or the model's table object, only the `ClientRow` type.

---

## drizzle-client.repository.ts (implementation)

Implements the interface and composes the filter map. The constructor receives a `DbExecutor` — either the global `db` (pages) or a transaction `tx` (actions) — and every query goes through `this.db`.

```ts
// repositories/drizzle-client.repository.ts
import { and, count, desc, eq } from 'drizzle-orm';
import type { DbExecutor } from '@/modules/shared/infrastructure/db-executor';
import { applyFilters } from '@/modules/shared/infrastructure/drizzle-query-filters';
import { clients, type ClientRow } from '../models/client.model';
import { clientFilters } from './client.filters';
import { ClientNotFoundException } from '../exceptions/client-not-found.exception';
import type { ClientRepository } from './client.repository';
import type { CreateClientCommand } from '../commands/create-client.command';
import type { UpdateClientCommand } from '../commands/update-client.command';
import type { UpdateStatusClientCommand } from '../commands/update-status-client.command';
import type { SearchClientCommand } from '../commands/search-client.command';

export class DrizzleClientRepository implements ClientRepository {
  constructor(private readonly db: DbExecutor) {}

  async create(command: CreateClientCommand): Promise<void> {
    await this.db.insert(clients).values({
      id: command.id,
      companyId: command.companyId,
      name: command.name,
      status: 'active',
    });
  }

  async findById(id: string, companyId: string): Promise<ClientRow | null> {
    const [row] = await this.db
      .select()
      .from(clients)
      .where(and(eq(clients.id, id), eq(clients.companyId, companyId)))
      .limit(1);
    return row ?? null;
  }

  async findOrFail(id: string, companyId: string): Promise<ClientRow> {
    const row = await this.findById(id, companyId);
    if (!row) throw new ClientNotFoundException(id);
    return row;
  }

  async update(row: ClientRow, command: UpdateClientCommand): Promise<void> {
    await this.db.update(clients).set({ name: command.name }).where(eq(clients.id, row.id));
  }

  async updateStatus(row: ClientRow, command: UpdateStatusClientCommand): Promise<void> {
    await this.db.update(clients).set({ status: command.status }).where(eq(clients.id, row.id));
  }

  async search(command: SearchClientCommand): Promise<{ data: ClientRow[]; total: number }> {
    const where = and(
      eq(clients.companyId, command.companyId),
      ...applyFilters(clientFilters, command.filters),
    );

    const [{ total }] = await this.db.select({ total: count() }).from(clients).where(where);

    const data = await this.db
      .select()
      .from(clients)
      .where(where)
      .orderBy(desc(clients.createdAt))
      .limit(command.limit)
      .offset(command.offset);

    return { data, total };
  }
}
```

Notes on the implementation:

- `update()` / `updateStatus()` receive the already-loaded `row` (the service fetched it with `findById(id, companyId)`), so the `where` only needs `row.id` — the company check already happened.
- Ordering is always `orderBy(desc(clients.createdAt))` for listings: newest first.
- `count()` from `drizzle-orm` already maps to a `number`; no raw ``sql`count(*)` `` needed.
- Modules with soft deletion (`deletedAt`) add `isNull(clients.deletedAt)` to every `where` — see `no-delete-policy`.

---

## How the Criteria Pattern Works

```
page.tsx                         SearchClientCommand              DrizzleClientRepository
────────                         ───────────────────              ───────────────────────
searchClientSchema.parse(        filters: {                       applyFilters(clientFilters, filters)
  await searchParams   ──────►     search: 'foo',       ──────►     calls clientFilters.search('foo')
)                                  status: 'active',                calls clientFilters.status('active')
                                 }
                                 companyId: '0192…'     ──────►   eq(clients.companyId, companyId)
```

Keys in `command.filters` → must match keys in `clientFilters`.
Empty/null values are automatically skipped inside `applyFilters()`.
`companyId` is **not** a filter — it is a mandatory condition added by the repository itself.

---

## Adding a New Filter

1. Add the key to `search-client.schema.ts` (Zod) and to the `filters` object built in `page.tsx`.
2. Add the entry to `client.filters.ts`:

```ts
export const clientFilters = {
  search: (value) => ilike(clients.name, `%${value}%`),
  status: (value) => eq(clients.status, value),
  city: (value) => eq(clients.city, value), // ← new
} satisfies FilterMap;
```

No changes needed in the Command, the Service, or the repository's `search()` method.

---

## Adding Extra Non-Filter Methods

Add to the interface first, then implement in the Drizzle repository. Scoped methods take `companyId` explicitly.

```ts
// In the interface (client.repository.ts)
existsByName(name: string, companyId: string): Promise<boolean>;
```

```ts
// In the implementation (drizzle-client.repository.ts)
async existsByName(name: string, companyId: string): Promise<boolean> {
  const [row] = await this.db
    .select({ id: clients.id })
    .from(clients)
    .where(and(eq(clients.companyId, companyId), eq(clients.name, name)))
    .limit(1);
  return row !== undefined;
}
```

Because the fake repository used by unit tests implements the same interface, every new method must also be added to `tests/unit/modules/client/fake-client.repository.ts` (see `nextjs-module-services`).

---

## Container Binding

The container is the **only** file that names the concrete repository. It receives a `DbExecutor` so the same services run against `db` (pages) or `tx` (actions inside `db.transaction`).

```ts
// src/modules/client/container.ts
import type { DbExecutor } from '@/modules/shared/infrastructure/db-executor';
import { DrizzleClientRepository } from './repositories/drizzle-client.repository';
import { ClientCreateService } from './services/client-create.service';
import { ClientUpdateService } from './services/client-update.service';
import { ClientUpdateStatusService } from './services/client-update-status.service';
import { ClientFindService } from './services/client-find.service';
import { ClientSearchService } from './services/client-search.service';

export function createClientContainer(db: DbExecutor) {
  const repository = new DrizzleClientRepository(db);

  return {
    repository,
    createService: new ClientCreateService(repository),
    updateService: new ClientUpdateService(repository),
    updateStatusService: new ClientUpdateStatusService(repository),
    findService: new ClientFindService(repository),
    searchService: new ClientSearchService(repository),
  };
}
```

Usage: `createClientContainer(db)` in pages, `createClientContainer(tx)` inside an action's transaction. Another module that needs this repository takes it from `createClientContainer(db).repository` — it never imports `DrizzleClientRepository` directly.

---

## Testing

Repositories are covered by **integration tests** (Vitest against the test database) — the fake used by unit tests exercises the services, not the SQL.

```ts
// tests/integration/modules/client/drizzle-client.repository.test.ts
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db/client';
import { clients } from '@/modules/client/models/client.model';
import { DrizzleClientRepository } from '@/modules/client/repositories/drizzle-client.repository';
import { SearchClientCommand } from '@/modules/client/commands/search-client.command';
import { truncate } from '../../helpers/truncate';

const COMPANY_A = '0192f3a0-0000-7000-8000-00000000c0a1';
const COMPANY_B = '0192f3a0-0000-7000-8000-00000000c0b2';

describe('DrizzleClientRepository', () => {
  beforeEach(() => truncate(clients));

  it('search only returns rows of the given company', async () => {
    await db.insert(clients).values([
      { id: '0192f3a0-0000-7000-8000-000000000001', companyId: COMPANY_A, name: 'Ana', status: 'active' },
      { id: '0192f3a0-0000-7000-8000-000000000002', companyId: COMPANY_B, name: 'Ana', status: 'active' },
    ]);

    const { data, total } = await new DrizzleClientRepository(db).search(
      new SearchClientCommand({ filters: { search: 'an' }, companyId: COMPANY_A }),
    );

    expect(total).toBe(1);
    expect(data[0].companyId).toBe(COMPANY_A);
  });
});
```

Always include one test per repository asserting company isolation, and one per filter key asserting it narrows the result.
