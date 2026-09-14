---
name: nextjs-modular-architecture
description: Modular architecture guide for this Next.js project (App Router + Server Actions + Drizzle + better-auth). Use this skill whenever the user asks to create a module, a service, a repository, a Command, a page, a server action, or any file within a module. Also use it when the user says "create the X module", "add the X CRUD", "implement the X logic", or when asking how to organize files in this project.
license: MIT
metadata:
  author: project
---

# Next.js Modular Architecture

This skill defines the standard modular architecture for this project. Every new file must follow this structure without exception.

The stack is fixed: **Next.js App Router**, **TypeScript**, **Server Actions** for every mutation, **PostgreSQL + Drizzle ORM**, **better-auth** (organization = company), **Zod**, **Tailwind v4 + shadcn/ui**, **Vitest** and **Playwright**, **pnpm**.

---

## Folder Structure

Every module includes by default the following use cases: **Crear, Actualizar, Actualizar Estado, Ver, Editar y Listar**.

A module is split in two places: the HTTP-facing layer (pages + actions) lives under `src/app/[companyId]/`, everything else lives under `src/modules/{module-name}/`.

```
src/
├── app/
│   └── [companyId]/
│       ├── layout.tsx                          requireCompanyAccess(companyId) + <FlashToaster />
│       └── {module-name}s/
│           ├── page.tsx                        Listar
│           ├── create/page.tsx                 Crear (form)
│           ├── [id]/page.tsx                   Ver
│           ├── [id]/edit/page.tsx              Editar (form)
│           └── actions.ts                      'use server': create / update / updateStatus
│
└── modules/
    └── {module-name}/
        ├── models/
        │   └── {module-name}.model.ts          Drizzle pgTable + relations + Row types
        ├── commands/
        │   ├── create-{module-name}.command.ts
        │   ├── update-{module-name}.command.ts
        │   ├── update-status-{module-name}.command.ts
        │   └── search-{module-name}.command.ts
        ├── validation/
        │   ├── create-{module-name}.schema.ts  Zod
        │   ├── update-{module-name}.schema.ts
        │   ├── update-status-{module-name}.schema.ts
        │   └── search-{module-name}.schema.ts  (parses searchParams)
        ├── serializers/
        │   └── {module-name}.serializer.ts     to{Module}Dto(row)
        ├── services/
        │   ├── {module-name}-create.service.ts
        │   ├── {module-name}-update.service.ts
        │   ├── {module-name}-update-status.service.ts
        │   ├── {module-name}-find.service.ts
        │   └── {module-name}-search.service.ts
        ├── repositories/
        │   ├── {module-name}.repository.ts             interface
        │   ├── {module-name}.filters.ts                criteria map
        │   └── drizzle-{module-name}.repository.ts     implementation
        ├── exceptions/
        │   └── {module-name}-not-found.exception.ts
        ├── container.ts                        create{Module}Container(db) — DI factory
        ├── permissions.ts                      {MODULE}_PERMISSIONS
        ├── routes.ts                           typed URL builders
        └── ui/
            ├── components/                     {Module}List.tsx, {Module}Form.tsx, {Module}Card.tsx
            ├── contexts/                       {Module}FormContext.tsx
            ├── hooks/                          use{Module}Form.ts, use{Module}List.ts, use{Module}Actions.ts
            └── types/                          {Module}.ts (Filters, Meta — UI-only types)
```

Naming: non-component TypeScript files are **kebab-case with a layer suffix** (`client-create.service.ts`); React components are **PascalCase** (`ClientList.tsx`). Classes are PascalCase (`ClientCreateService`). The module slug in URLs and permissions is the **plural, lowercase, kebab-case** name (`clients`, `sale-orders`).

---

## Layer Responsibilities

| Layer | Responsibility |
|---|---|
| **page.tsx** (×4) | Handles GET: index (Listar), create (form Crear), show (Ver), edit (form Editar). Async Server Component. Guards permission, parses params, calls a Service, serializes, renders a UI component. |
| **actions.ts** | Handles mutations: store (Crear), update (Actualizar), updateStatus (Actualizar Estado). `'use server'`. Guards permission, validates with Zod, builds a Command, runs the Service inside a transaction, returns `ActionState` or redirects. |
| **Validation (Zod schema)** | Input shape validation and Spanish error messages. Nothing else. |
| **Service** | Business logic. One Service per action. Receives the repository interface via constructor. |
| **Repository** | Single point of database access. Implements an interface. Receives a `DbExecutor` (`db` or `tx`). |
| **Command** | Typed object for transporting data between layers. No logic. Fields are `readonly`. |
| **Serializer** | Transforms a Drizzle row into a JSON-safe DTO. Never expose the raw row to a client component. |
| **Model** | Drizzle table definition, relations, and row types. No business logic. |
| **Exception** | Domain errors for the module, extending `DomainError`. |
| **Container** | Wires the concrete repository into the module's services. The only place that names the concrete repository. |
| **permissions.ts / routes.ts** | Declares the module's permission actions and its typed URL builders. |

---

## Default Use Cases

| Use Case | Method | URL | File | Service |
|---|---|---|---|---|
| **Listar** | GET | `/{companyId}/{module}s` | `page.tsx` | `{Module}SearchService` |
| **Crear (form)** | GET | `/{companyId}/{module}s/create` | `create/page.tsx` | — |
| **Crear (action)** | Server Action | — | `actions.ts` → `create{Module}Action` | `{Module}CreateService` |
| **Ver** | GET | `/{companyId}/{module}s/{id}` | `[id]/page.tsx` | `{Module}FindService` |
| **Editar (form)** | GET | `/{companyId}/{module}s/{id}/edit` | `[id]/edit/page.tsx` | `{Module}FindService` |
| **Actualizar (action)** | Server Action | — | `actions.ts` → `update{Module}Action` | `{Module}UpdateService` |
| **Actualizar Estado** | Server Action | — | `actions.ts` → `update{Module}StatusAction` | `{Module}UpdateStatusService` |

Every use case is guarded by exactly one permission (`{module}.list`, `.create`, `.show`, `.update`, `.update-status`). See `nextjs-module-pages` and `nextjs-module-actions`.

---

## Path Alias

All imports use the `@/` alias mapped to `src/`:

```ts
import { db } from '@/db/client';
import { createClientContainer } from '@/modules/client/container';
```

Never use relative imports that climb out of a module (`../../other-module`). Cross-module access goes through the other module's public files (`container.ts`, `serializers`, `models`).

---

## Layer-Specific Skills

Each layer has a dedicated skill with full templates and rules. Activate the relevant skill when working on that layer:

| Layer | Skill |
|---|---|
| Pages (GET) | `nextjs-module-pages` |
| Server Actions (mutations) | `nextjs-module-actions` |
| Validation (Zod) | `nextjs-module-validation` |
| Serializers | `nextjs-module-serializers` |
| Services | `nextjs-module-services` |
| Repositories | `nextjs-module-repositories` |
| Commands | `nextjs-module-commands` |
| Models (Drizzle) | `nextjs-module-models` |
| Exceptions | `nextjs-module-exceptions` |
| Sequential code (`CLI000001`) | `nextjs-module-sequential-code` |
| Frontend (ui/) | `nextjs-modular-frontend` |
| Deletion policy | `no-delete-policy` |

---

## Shared Infrastructure

Every module depends on these contracts under `src/modules/shared/`. Do not reimplement them inside a module.

| File | Exports | Purpose |
|---|---|---|
| `shared/infrastructure/db-executor.ts` | `type DbExecutor` | Union of the Drizzle `db` client and a transaction `tx`. Repositories receive one; they never import the global `db`. |
| `shared/infrastructure/drizzle-query-filters.ts` | `type FilterMap`, `applyFilters(map, filters)` | Criteria pattern: turns a `filters` object into an array of Drizzle `SQL` conditions, skipping `null`/`undefined`/`''`. |
| `shared/auth/require-permission.ts` | `getSessionUser()`, `hasPermission(companyId, action)`, `requirePermission(companyId, action)`, `guardPage(companyId, action)` | Permission checks. `hasPermission` is wrapped in `React.cache`. `requirePermission` throws `ForbiddenError` (for actions). `guardPage` redirects (for pages). A role with `permissionType === 'all'` passes every check. |
| `shared/auth/require-company-access.ts` | `requireCompanyAccess(companyId)` | Verifies the session user belongs to the company. Called once in `src/app/[companyId]/layout.tsx`. |
| `shared/actions/action-state.ts` | `type ActionState`, `toActionError(error)` | Serializable result of a server action: `{ status: 'idle' \| 'error'; message?: string; fieldErrors?: Record<string, string[] \| undefined> }`. `toActionError` maps `DomainError` → `{ status: 'error', message }`, `ForbiddenError` → `'No tienes permiso para realizar esta acción.'`, anything else is rethrown. |
| `shared/flash/flash.ts` | `setFlash(type, message)`, `readFlash()` | One-shot flash message stored in a cookie by actions and read by `<FlashToaster />` in the company layout. |
| `shared/exceptions/domain-error.ts` | `DomainError`, `NotFoundError`, `ForbiddenError` | Base error classes. Module exceptions extend `DomainError`. |
| `shared/permissions/registry.ts` | `PERMISSION_REGISTRY` | Aggregates every module's `permissions.ts`. Seeded by `pnpm db:seed`. Read by the roles UI. |
| `shared/menu/menu-registry.ts` | `MENU_REGISTRY` | Sidebar entries (label, url, permission, icon, order, section). Single source of truth for the menu. |
| `shared/uuid.ts` | `uuidv7()` | UUID v7 generator (wraps the `uuid` package). |

```ts
// shared/infrastructure/db-executor.ts
import type { db } from '@/db/client';

export type DbExecutor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];
```

```ts
// shared/infrastructure/drizzle-query-filters.ts
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

```ts
// shared/auth/require-permission.ts
import 'server-only';
import { cache } from 'react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { ForbiddenError } from '@/modules/shared/exceptions/domain-error';
import { userHasPermission } from '@/modules/permission/queries/user-has-permission';

export const getSessionUser = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
});

export const hasPermission = cache(async (companyId: string, action: string): Promise<boolean> => {
  const user = await getSessionUser();
  if (!user) return false;
  return userHasPermission(user.id, companyId, action); // role.permissionType === 'all' passes
});

/** For server actions: throws, the action returns an error state. */
export async function requirePermission(companyId: string, action: string): Promise<void> {
  if (!(await hasPermission(companyId, action))) throw new ForbiddenError(action);
}

/** For pages: a Server Component cannot set cookies, so it redirects. */
export async function guardPage(companyId: string, action: string): Promise<never | void> {
  if (!(await hasPermission(companyId, action))) redirect(`/${companyId}/dashboard?error=forbidden`);
}
```

```ts
// shared/actions/action-state.ts
import { DomainError, ForbiddenError } from '@/modules/shared/exceptions/domain-error';

export type ActionState = {
  status: 'idle' | 'error';
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export const initialActionState: ActionState = { status: 'idle' };

export function toActionError(error: unknown): ActionState {
  if (error instanceof ForbiddenError) {
    return { status: 'error', message: 'No tienes permiso para realizar esta acción.' };
  }
  if (error instanceof DomainError) {
    return { status: 'error', message: error.message };
  }
  throw error;
}
```

---

## Code Templates

The examples below use `Client` / `clients` as the module. Replace with the real module name.

### Command

The `id` is always the **first property** in Create commands. It is generated by the client (UUID v7) and sent in the form — never generated on the server. `companyId` always comes from the `[companyId]` URL segment, never from the form or the session.

```ts
// commands/create-client.command.ts
import type { CreateClientInput } from '../validation/create-client.schema';

export class CreateClientCommand {
  constructor(
    readonly id: string,
    readonly companyId: string,
    readonly name: string,
    // add properties as needed
  ) {}

  static fromInput(input: CreateClientInput, companyId: string): CreateClientCommand {
    return new CreateClientCommand(input.id, companyId, input.name);
  }
}
```

```ts
// commands/search-client.command.ts
export class SearchClientCommand {
  readonly filters: Record<string, string | undefined>;
  readonly limit: number;
  readonly offset: number;
  readonly companyId: string;

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

See `nextjs-module-commands` for Update and UpdateStatus.

---

### Repository Interface

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
  findOrFail(id: string, companyId: string): Promise<ClientRow>;
  update(row: ClientRow, command: UpdateClientCommand): Promise<void>;
  updateStatus(row: ClientRow, command: UpdateStatusClientCommand): Promise<void>;
  search(command: SearchClientCommand): Promise<{ data: ClientRow[]; total: number }>;
}
```

---

### Repository (Drizzle)

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

---

### Services

```ts
// services/client-create.service.ts
import type { ClientRepository } from '../repositories/client.repository';
import type { CreateClientCommand } from '../commands/create-client.command';
import type { ClientRow } from '../models/client.model';

export class ClientCreateService {
  constructor(private readonly repository: ClientRepository) {}

  async execute(command: CreateClientCommand): Promise<ClientRow> {
    await this.repository.create(command);
    return this.repository.findOrFail(command.id, command.companyId);
  }
}
```

```ts
// services/client-update.service.ts
import type { ClientRepository } from '../repositories/client.repository';
import type { UpdateClientCommand } from '../commands/update-client.command';
import type { ClientRow } from '../models/client.model';
import { ClientNotFoundException } from '../exceptions/client-not-found.exception';

export class ClientUpdateService {
  constructor(private readonly repository: ClientRepository) {}

  async execute(id: string, companyId: string, command: UpdateClientCommand): Promise<ClientRow> {
    const row = await this.repository.findById(id, companyId);
    if (!row) throw new ClientNotFoundException(id);

    await this.repository.update(row, command);
    return this.repository.findOrFail(id, companyId);
  }
}
```

```ts
// services/client-update-status.service.ts
import type { ClientRepository } from '../repositories/client.repository';
import type { UpdateStatusClientCommand } from '../commands/update-status-client.command';
import type { ClientRow } from '../models/client.model';
import { ClientNotFoundException } from '../exceptions/client-not-found.exception';

export class ClientUpdateStatusService {
  constructor(private readonly repository: ClientRepository) {}

  async execute(id: string, companyId: string, command: UpdateStatusClientCommand): Promise<ClientRow> {
    const row = await this.repository.findById(id, companyId);
    if (!row) throw new ClientNotFoundException(id);

    await this.repository.updateStatus(row, command);
    return this.repository.findOrFail(id, companyId);
  }
}
```

```ts
// services/client-find.service.ts
import type { ClientRepository } from '../repositories/client.repository';
import type { ClientRow } from '../models/client.model';
import { ClientNotFoundException } from '../exceptions/client-not-found.exception';

export class ClientFindService {
  constructor(private readonly repository: ClientRepository) {}

  async execute(id: string, companyId: string): Promise<ClientRow> {
    const row = await this.repository.findById(id, companyId);
    if (!row) throw new ClientNotFoundException(id);
    return row;
  }
}
```

```ts
// services/client-search.service.ts
import type { ClientRepository } from '../repositories/client.repository';
import type { SearchClientCommand } from '../commands/search-client.command';
import type { ClientRow } from '../models/client.model';

export class ClientSearchService {
  constructor(private readonly repository: ClientRepository) {}

  execute(command: SearchClientCommand): Promise<{ data: ClientRow[]; total: number }> {
    return this.repository.search(command);
  }
}
```

---

### Container

The container is the module's dependency wiring. It receives a `DbExecutor` so the same services run against `db` (pages) or `tx` (actions inside a transaction).

```ts
// container.ts
import type { DbExecutor } from '@/modules/shared/infrastructure/db-executor';
import { DrizzleClientRepository } from './repositories/drizzle-client.repository';
import { ClientCreateService } from './services/client-create.service';
import { ClientUpdateService } from './services/client-update.service';
import { ClientUpdateStatusService } from './services/client-update-status.service';
import { ClientFindService } from './services/client-find.service';
import { ClientSearchService } from './services/client-search.service';

export function createClientContainer(db: DbExecutor) {
  const repository = new DrizzleClientRepository(db); // the ONLY place the concrete repository is named

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

---

### Pages (GET)

```tsx
// src/app/[companyId]/clients/page.tsx — Listar
import { db } from '@/db/client';
import { guardPage } from '@/modules/shared/auth/require-permission';
import { createClientContainer } from '@/modules/client/container';
import { SearchClientCommand } from '@/modules/client/commands/search-client.command';
import { searchClientSchema } from '@/modules/client/validation/search-client.schema';
import { toClientDto } from '@/modules/client/serializers/client.serializer';
import { ClientList } from '@/modules/client/ui/components/ClientList';

type Props = {
  params: Promise<{ companyId: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function ClientsPage({ params, searchParams }: Props) {
  const { companyId } = await params;
  await guardPage(companyId, 'clients.list');

  const filters = searchClientSchema.parse(await searchParams);
  const command = new SearchClientCommand({
    filters: { search: filters.search, status: filters.status },
    limit: filters.limit,
    offset: filters.offset,
    companyId,
  });

  const { data, total } = await createClientContainer(db).searchService.execute(command);

  return (
    <ClientList
      companyId={companyId}
      items={data.map(toClientDto)}
      meta={{ total, limit: filters.limit, offset: filters.offset, hasMore: filters.offset + filters.limit < total }}
      filters={filters}
    />
  );
}
```

```tsx
// src/app/[companyId]/clients/[id]/page.tsx — Ver
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { db } from '@/db/client';
import { guardPage } from '@/modules/shared/auth/require-permission';
import { createClientContainer } from '@/modules/client/container';
import { toClientDto } from '@/modules/client/serializers/client.serializer';
import { ClientNotFoundException } from '@/modules/client/exceptions/client-not-found.exception';
import { ClientCard } from '@/modules/client/ui/components/ClientCard';

type Props = { params: Promise<{ companyId: string; id: string }> };

export default async function ClientShowPage({ params }: Props) {
  const { companyId, id } = await params;
  await guardPage(companyId, 'clients.show');

  if (!z.string().uuid().safeParse(id).success) notFound();

  try {
    const row = await createClientContainer(db).findService.execute(id, companyId);
    return <ClientCard companyId={companyId} client={toClientDto(row)} />;
  } catch (error) {
    if (error instanceof ClientNotFoundException) notFound();
    throw error;
  }
}
```

See `nextjs-module-pages` for `create` and `edit`.

---

### Server Actions

```ts
// src/app/[companyId]/clients/actions.ts
'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db } from '@/db/client';
import { requirePermission } from '@/modules/shared/auth/require-permission';
import { toActionError, type ActionState } from '@/modules/shared/actions/action-state';
import { setFlash } from '@/modules/shared/flash/flash';
import { createClientSchema } from '@/modules/client/validation/create-client.schema';
import { CreateClientCommand } from '@/modules/client/commands/create-client.command';
import { createClientContainer } from '@/modules/client/container';
import { clientRoutes } from '@/modules/client/routes';

export async function createClientAction(
  companyId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requirePermission(companyId, 'clients.create');

    const parsed = createClientSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { status: 'error', fieldErrors: parsed.error.flatten().fieldErrors };
    }

    await db.transaction(async (tx) => {
      await createClientContainer(tx).createService.execute(
        CreateClientCommand.fromInput(parsed.data, companyId),
      );
    });
  } catch (error) {
    return toActionError(error);
  }

  revalidatePath(clientRoutes.index(companyId));
  await setFlash('success', 'Cliente creado correctamente.');
  redirect(clientRoutes.index(companyId)); // MUST be outside try/catch — redirect() throws
}
```

See `nextjs-module-actions` for `update` and `updateStatus`.

---

### Serializer

```ts
// serializers/client.serializer.ts
import type { ClientRow } from '../models/client.model';

export type ClientDto = {
  id: string;
  name: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string | null;
};

export function toClientDto(row: ClientRow): ClientDto {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt?.toISOString() ?? null,
  };
}
```

---

### Exception

```ts
// exceptions/client-not-found.exception.ts
import { DomainError } from '@/modules/shared/exceptions/domain-error';

export class ClientNotFoundException extends DomainError {
  constructor(id?: string) {
    super(id ? `Cliente ${id} no encontrado.` : 'Cliente no encontrado.');
    this.name = 'ClientNotFoundException';
  }
}
```

---

### Routes and Permissions

```ts
// routes.ts — replaces named routes; never hardcode URLs in components
const base = (companyId: string) => `/${companyId}/clients`;

export const clientRoutes = {
  index: (companyId: string, query?: Record<string, string | number | undefined>) => {
    const qs = query
      ? new URLSearchParams(
          Object.entries(query).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => [k, String(v)]),
        ).toString()
      : '';
    return qs ? `${base(companyId)}?${qs}` : base(companyId);
  },
  create: (companyId: string) => `${base(companyId)}/create`,
  show: (companyId: string, id: string) => `${base(companyId)}/${id}`,
  edit: (companyId: string, id: string) => `${base(companyId)}/${id}/edit`,
};
```

```ts
// permissions.ts
export const CLIENT_MODULE = {
  id: 'clients',
  label: 'Clientes',
  permissions: [
    { id: 'clients.list', label: 'Listar' },
    { id: 'clients.create', label: 'Crear' },
    { id: 'clients.show', label: 'Ver' },
    { id: 'clients.update', label: 'Editar' },
    { id: 'clients.update-status', label: 'Cambiar estado' },
  ],
} as const;
```

---

## Registering the Module

A module is not reachable until these four steps are done.

### 1. Model barrel

Re-export the module's tables and relations from `src/db/schema.ts`. `drizzle-kit` and the relational query API only see what is exported there.

```ts
export * from '@/modules/client/models/client.model';
```

### 2. Permissions registry

Add the module's `permissions.ts` export to `src/modules/shared/permissions/registry.ts`:

```ts
export const PERMISSION_REGISTRY = [USER_MODULE, ROLE_MODULE, CLIENT_MODULE] as const;
```

### 3. Sidebar menu (ALWAYS add the entry)

**Every new module MUST add its entry to `src/modules/shared/menu/menu-registry.ts`.** Without it the module exists but has no sidebar entry, so users can't reach it.

```ts
{ id: 'clients', label: 'Clientes', url: '/clients', permission: 'clients.list', icon: 'Users', order: 30, section: 'main' },
```

- `url` is relative to the company: the sidebar prepends `/${companyId}` at render time.
- `permission` is the module's `.list` action; the entry is hidden if the user lacks it.
- A parent group with children must use `section: 'main'` (the footer nav does not render children).

### 4. Seed

Run `pnpm db:seed`. The seed upserts modules, permissions and menu entries from the registries with `onConflictDoNothing()`; it is idempotent and safe to re-run.

---

## Next.js Concerns

These have no equivalent in a classic MVC backend and are easy to get wrong:

- **Server vs client**: `page.tsx`, `layout.tsx` and everything under `src/modules/*/` except `ui/` are server-only. Add `'use client'` only to leaf interactive components (`ui/components/*List.tsx`, `*Form.tsx`, hooks). Put `import 'server-only'` at the top of `shared/auth/*` and any file that touches `db`.
- **`params` and `searchParams` are Promises** in pages. Always `await` them.
- **Only JSON-safe DTOs cross the server → client boundary.** Never pass a Drizzle row, a `Date` or a class instance as a prop to a client component. Use the serializer.
- **`'use server'`** goes at the top of `actions.ts`. Every exported function there is a public endpoint: validate everything, trust nothing from `FormData`, and bind `companyId`/`id` as arguments instead of reading them from the form.
- **`redirect()` and `notFound()` throw.** Never call them inside a `try/catch` that catches everything; place them after the `catch`.
- **`revalidatePath()`** after every successful mutation, before redirecting, so the listing shows fresh data.
- **`React.cache`** wraps per-request lookups (`getSessionUser`, `hasPermission`) so layout, page and nested components share one query.
- **Transactions**: the action opens `db.transaction(async (tx) => ...)` and passes `tx` to `create{Module}Container(tx)`. Services and repositories never open transactions themselves.
- **No Route Handlers (`route.ts`) and no client-side `fetch`** for module CRUD. Server Actions are the only mutation channel; pages read directly through services.

---

## Test Structure

```
tests/
├── unit/
│   └── modules/
│       └── {module-name}/
│           ├── {module-name}-create.service.test.ts
│           ├── {module-name}-update.service.test.ts
│           ├── {module-name}-update-status.service.test.ts
│           ├── {module-name}-find.service.test.ts
│           └── {module-name}-search.service.test.ts
├── integration/
│   └── modules/
│       └── {module-name}/
│           ├── {module-name}-list.test.ts
│           ├── {module-name}-create.test.ts
│           ├── {module-name}-show.test.ts
│           ├── {module-name}-update.test.ts
│           └── {module-name}-update-status.test.ts
├── factories/
│   └── {module-name}.factory.ts
└── e2e/
    └── {module-name}s.spec.ts
```

- **Unit** (Vitest): instantiate the service with an in-memory fake implementing the repository interface. No database.
- **Integration** (Vitest): run against the test database (`DATABASE_URL_TEST`), truncate the module tables in `beforeEach`, call the server actions / services directly with `next/cache`, `next/navigation`, `server-only` and `requirePermission` mocked.
- **E2E** (Playwright): log in, navigate the four pages, submit the forms, assert the list and the toast.

### Unit Test Template (Service)

```ts
// tests/unit/modules/client/client-create.service.test.ts
import { describe, expect, it } from 'vitest';
import { ClientCreateService } from '@/modules/client/services/client-create.service';
import { CreateClientCommand } from '@/modules/client/commands/create-client.command';
import { FakeClientRepository } from './fake-client.repository';

describe('ClientCreateService', () => {
  it('creates successfully', async () => {
    const repository = new FakeClientRepository();
    const service = new ClientCreateService(repository);
    const command = new CreateClientCommand('0192f3a0-0000-7000-8000-000000000001', 'company-1', 'Test');

    const result = await service.execute(command);

    expect(result.name).toBe('Test');
    expect(repository.rows).toHaveLength(1);
  });
});
```

### Integration Test Template (Action)

```ts
// tests/integration/modules/client/client-create.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { clients } from '@/modules/client/models/client.model';
import { truncate } from '../../helpers/truncate';

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect: vi.fn(() => { throw new Error('NEXT_REDIRECT'); }) }));
vi.mock('@/modules/shared/auth/require-permission', () => ({ requirePermission: vi.fn() }));
vi.mock('@/modules/shared/flash/flash', () => ({ setFlash: vi.fn() }));

import { createClientAction } from '@/app/[companyId]/clients/actions';

describe('createClientAction', () => {
  beforeEach(() => truncate(clients));

  it('can create', async () => {
    const formData = new FormData();
    formData.set('id', '0192f3a0-0000-7000-8000-000000000001');
    formData.set('name', 'Test');

    await expect(createClientAction('company-1', { status: 'idle' }, formData)).rejects.toThrow('NEXT_REDIRECT');

    const [row] = await db.select().from(clients).where(eq(clients.name, 'Test'));
    expect(row).toBeDefined();
  });
});
```

---

## Mandatory Rules

1. **Never** put business logic in `page.tsx` or `actions.ts`.
2. **Never** import `@/db/*` or `drizzle-orm` in a Service — always go through the Repository interface.
3. **Always** inject the Repository interface into the Service; the concrete repository is named only in `container.ts`.
4. **Always** one Service per action: `CreateService`, `UpdateService`, `UpdateStatusService`, `FindService`, `SearchService`.
5. **Always** declare Command fields as `readonly`.
6. **Never** physically delete records — use `UpdateStatusService` to deactivate. Activate the `no-delete-policy` skill.
7. Each module has its own `container.ts`, `routes.ts`, `permissions.ts` and its own folder under `src/app/[companyId]/`.
8. Unit tests use an in-memory fake of the Repository — they never touch the database.
9. Integration tests run against the test database and exercise the full action/page flow; Playwright covers the browser flow.
10. IDs are UUIDs — validate `id` with `z.string().uuid()` at the top of every `[id]` page and every action that receives an id; respond with `notFound()` (pages) or an error state (actions).
11. **Always** add the new module to `src/modules/shared/menu/menu-registry.ts` and its permissions to `src/modules/shared/permissions/registry.ts`, then run `pnpm db:seed`. A module without a menu entry is unreachable.
12. **Every mutation is a Server Action.** No Route Handlers and no client-side `fetch` for module CRUD.
13. **Every module model is re-exported from `src/db/schema.ts`.**
14. **Every page and action is permission-protected** with exactly one `{module}.{action}` string as its first statement.
