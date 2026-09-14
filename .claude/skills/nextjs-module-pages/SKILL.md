---
name: nextjs-module-pages
description: "Guide for creating the GET pages (index, create form, show, edit form) of a module in the modular Next.js architecture. Activates when creating or modifying page.tsx, create/page.tsx, [id]/page.tsx or [id]/edit/page.tsx under src/app/[companyId]/{module-name}s/, or the company layout src/app/[companyId]/layout.tsx."
license: MIT
metadata:
  author: project
---

# Next.js Module — Pages

Pages are thin async Server Components. They **never contain business logic**. Their only job is to guard the permission, resolve `params`/`searchParams`, delegate to a Service, serialize the result and render a UI component.

## Location

```
src/app/[companyId]/{module-name}s/
├── page.tsx              — Listar (index)
├── create/page.tsx       — Crear (form)
├── [id]/page.tsx         — Ver (show)
└── [id]/edit/page.tsx    — Editar (form)
```

Mutations are not here: they live in `actions.ts` next to these files (see `nextjs-module-actions`).

## Rules

1. **Never** put business logic in a page.
2. Every page is an `async` default-export Server Component. No `'use client'` in a `page.tsx`.
3. `await params` / `await searchParams` **first** — they are Promises.
4. `await guardPage(companyId, '{module}.{action}')` is the **first statement after resolving `params`**, before any service call.
5. Validate `id` with `z.string().uuid()` on `[id]` pages; an invalid id calls `notFound()` before touching the database.
6. Get services from `create{Module}Container(db)` — never instantiate repositories or services directly, and never call `container.repository` from a page.
7. Parse `searchParams` with `search-{module-name}.schema.ts` and build the `Search{Module}Command` **in the page**, passing `companyId` from `params`.
8. Convert rows with the serializer (`to{Module}Dto`) before passing them to any `ui/` client component. A Drizzle row never crosses the server → client boundary.
9. Catch `{Module}NotFoundException` and call `notFound()`; rethrow anything else.
10. Pages never read cookies or the session directly — `requireCompanyAccess(companyId)` runs once in `src/app/[companyId]/layout.tsx`, and `guardPage` resolves the user internally.
11. Pages never call server actions — they only render forms/components that use them.
12. `export const dynamic = 'force-dynamic'` only when caching would be wrong **and** the page does not already opt out (see "Dynamic rendering").

---

## ⚠️ CRITICAL: `params`, `searchParams` and the `[id]` segment

Every module lives under the `[companyId]` segment, so every page receives `companyId` in `params`, and `[id]` pages receive `id` as well. Both are **Promises** in the App Router: forgetting `await` yields a Promise object, and `guardPage(promise.companyId, ...)` silently checks `undefined`.

✅ **Correct — resolve, guard, validate, in that order:**

```tsx
const { companyId, id } = await params;
await guardPage(companyId, 'clients.show');
if (!z.string().uuid().safeParse(id).success) notFound();
```

❌ **Wrong — destructuring a Promise, or guarding before resolving:**

```tsx
const { companyId } = params;                 // params is a Promise
await guardPage(companyId, 'clients.show');   // companyId is undefined
```

Rules of thumb:
- `Props` types always declare `params: Promise<{ companyId: string }>` (plus `id: string` for `[id]` pages) and `searchParams: Promise<Record<string, string | undefined>>` for the index.
- `notFound()` and `redirect()` (used inside `guardPage`) work by throwing — never call them inside a `try` that catches everything. Catch only the module exception and rethrow the rest.
- **Always add an integration test asserting that the search command is built with `companyId` from `params`** (company isolation, see "Testing").

---

## ⚠️ CRITICAL: Permission checks (every page)

Access is controlled by permission **action strings** of the form `{module}.{action}`, where `{module}` is the plural, lowercase module slug used in URLs (`users`, `roles`, `clients`). The user's role is resolved per company by `hasPermission(companyId, action)` (wrapped in `React.cache`, so layout, page and nested components share one lookup). A role with `permissionType === 'all'` (e.g. `Administrador`) passes every check automatically.

**Each page must enforce exactly one permission**, mapped as follows:

| Page | Use case | Permission action |
|---|---|---|
| `page.tsx` (index) | Listar | `{module}.list` |
| `create/page.tsx` (create view) | Crear | `{module}.create` |
| `[id]/page.tsx` (show) | Ver | `{module}.show` |
| `[id]/edit/page.tsx` (edit view) | Editar | `{module}.update` |

- The `create` view is guarded by `{module}.create` (same permission as `create{Module}Action`); the `edit` view is guarded by `{module}.update` (same permission as `update{Module}Action`). **There are no separate `edit` / `view` permission actions.**
- `guardPage()` redirects to `/${companyId}/dashboard?error=forbidden` when the check fails — a Server Component cannot set a flash cookie, so the dashboard reads the query flag and shows the toast. **Do not build a friendly response yourself**; the shared helper is all a page needs.
- Mutations are guarded by `requirePermission()` inside `actions.ts` — never re-check them in the page (see `nextjs-module-actions`).
- **Seed the permission rows.** A new module's actions (`{module}.list`, `.create`, `.show`, `.update`, `.update-status`) live in the module's `permissions.ts`, are aggregated by `src/modules/shared/permissions/registry.ts` and inserted by `pnpm db:seed`; the sidebar entry in `menu-registry.ts` uses `{module}.list` as its `permission`. Without the seeded rows, only `permissionType === 'all'` roles can reach the module.
- **Always add e2e tests** asserting that a user lacking the permission is redirected on each page, and that granting it allows access.

---

## Layout

`src/app/[companyId]/layout.tsx` runs once per request for every module page. It verifies company membership, renders the sidebar and mounts the flash toaster that shows the messages set by actions.

```tsx
// src/app/[companyId]/layout.tsx
import type { ReactNode } from 'react';
import { requireCompanyAccess } from '@/modules/shared/auth/require-company-access';
import { readFlash } from '@/modules/shared/flash/flash';
import { FlashToaster } from '@/modules/shared/flash/FlashToaster';
import { AppSidebar } from '@/components/layout/AppSidebar';

type Props = { children: ReactNode; params: Promise<{ companyId: string }> };

export default async function CompanyLayout({ children, params }: Props) {
  const { companyId } = await params;
  await requireCompanyAccess(companyId); // redirects to the company picker if the user is not a member

  return (
    <div className="flex min-h-screen">
      <AppSidebar companyId={companyId} />
      <main className="flex-1 p-6">{children}</main>
      <FlashToaster flash={await readFlash()} />
    </div>
  );
}
```

Pages assume the layout already ran: they never call `requireCompanyAccess` again.

---

## page.tsx (Listar)

```tsx
// src/app/[companyId]/clients/page.tsx
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

`searchClientSchema` applies the defaults (`limit` 20, `offset` 0) and coerces the strings from the URL, so the page never parses numbers by hand. Filter changes are URL changes: `ClientList` pushes `clientRoutes.index(companyId, filters)` and this page re-renders.

---

## create/page.tsx (Crear — form)

The page only guards and renders `ClientCreate`, the `'use client'` component that instantiates `useClientForm({ mode: 'create', companyId })` and wraps `ClientForm` in the `ClientFormProvider` (see `nextjs-modular-frontend`). Hooks cannot run in a Server Component, so the page never touches the form hook itself; the submit goes to `createClientAction` through that hook.

```tsx
// src/app/[companyId]/clients/create/page.tsx
import { guardPage } from '@/modules/shared/auth/require-permission';
import { ClientCreate } from '@/modules/client/ui/components/ClientCreate';

type Props = { params: Promise<{ companyId: string }> };

export default async function ClientCreatePage({ params }: Props) {
  const { companyId } = await params;
  await guardPage(companyId, 'clients.create');

  return <ClientCreate companyId={companyId} />;
}
```

---

## [id]/page.tsx (Ver)

```tsx
// src/app/[companyId]/clients/[id]/page.tsx
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

Because `findService.execute(id, companyId)` is company-scoped, a row from another company is a 404 — never a leak.

---

## [id]/edit/page.tsx (Editar — form)

Loads the row, serializes it, and passes the `client` DTO to `ClientEdit`, the `'use client'` component that instantiates `useClientForm({ mode: 'edit', companyId, client })` and renders the same `ClientForm` used by `create`; in `edit` mode the hook binds `updateClientAction` instead of `createClientAction`.

```tsx
// src/app/[companyId]/clients/[id]/edit/page.tsx
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { db } from '@/db/client';
import { guardPage } from '@/modules/shared/auth/require-permission';
import { createClientContainer } from '@/modules/client/container';
import { toClientDto } from '@/modules/client/serializers/client.serializer';
import { ClientNotFoundException } from '@/modules/client/exceptions/client-not-found.exception';
import { ClientEdit } from '@/modules/client/ui/components/ClientEdit';

type Props = { params: Promise<{ companyId: string; id: string }> };

export default async function ClientEditPage({ params }: Props) {
  const { companyId, id } = await params;
  await guardPage(companyId, 'clients.update');

  if (!z.string().uuid().safeParse(id).success) notFound();

  try {
    const row = await createClientContainer(db).findService.execute(id, companyId);
    return <ClientEdit companyId={companyId} client={toClientDto(row)} />;
  } catch (error) {
    if (error instanceof ClientNotFoundException) notFound();
    throw error;
  }
}
```

---

## Page naming / URL table

The App Router folder mirrors the module name in plural, lowercase kebab-case; `routes.ts` is the only place that spells these URLs.

| Module | Folder | URLs |
|---|---|---|
| `Client` | `src/app/[companyId]/clients/` | `/[companyId]/clients`, `/[companyId]/clients/create`, `/[companyId]/clients/[id]`, `/[companyId]/clients/[id]/edit` |
| `SaleOrder` | `src/app/[companyId]/sale-orders/` | `/[companyId]/sale-orders`, `/[companyId]/sale-orders/create`, `/[companyId]/sale-orders/[id]`, `/[companyId]/sale-orders/[id]/edit` |

Component names follow `{Module}{View}Page`: `ClientsPage`, `ClientCreatePage`, `ClientShowPage`, `ClientEditPage`.

---

## Dynamic rendering

Every module page calls `guardPage()`, which reads the session through `headers()`; that alone opts the page out of static rendering, so per-company lists are always rendered per request with fresh data. You do **not** need `export const dynamic = 'force-dynamic'` on them.

Add it only to a page that shows company data **without** touching `headers()`/`cookies()` (e.g. a public status page) where a cached render would show another request's data. Never add it "just in case" — it disables the router cache for that segment.

---

## Testing

### Playwright (e2e) — the four pages

```ts
// tests/e2e/clients.spec.ts
import { expect, test } from '@playwright/test';
import { loginAs } from './helpers/login';
import { seedClient } from './helpers/seed';

const COMPANY_ID = process.env.E2E_COMPANY_ID!;

test.beforeEach(async ({ page }) => {
  await loginAs(page, 'admin@example.com');
});

test('renders the list', async ({ page }) => {
  await seedClient({ companyId: COMPANY_ID, name: 'Ana' });
  await page.goto(`/${COMPANY_ID}/clients`);
  await expect(page.getByRole('heading', { name: 'Clientes' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Ana' })).toBeVisible();
});

test('create form submits and shows the toast', async ({ page }) => {
  await page.goto(`/${COMPANY_ID}/clients/create`);
  await page.getByLabel('Nombre').fill('Ana');
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect(page).toHaveURL(`/${COMPANY_ID}/clients`);
  await expect(page.getByText('Cliente creado correctamente.')).toBeVisible();
});

test('show page returns 404 for an unknown id', async ({ page }) => {
  const response = await page.goto(`/${COMPANY_ID}/clients/0192f3a0-0000-7000-8000-0000000000ff`);
  expect(response?.status()).toBe(404);
});

test('edit form updates the client', async ({ page }) => {
  const id = await seedClient({ companyId: COMPANY_ID, name: 'Ana' });
  await page.goto(`/${COMPANY_ID}/clients/${id}/edit`);
  await page.getByLabel('Nombre').fill('Ana María');
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect(page).toHaveURL(`/${COMPANY_ID}/clients/${id}`);
  await expect(page.getByText('Cliente actualizado correctamente.')).toBeVisible();
});
```

### Vitest (integration) — company isolation of the search page

A Server Component is an async function: call it with resolved Promises and inspect the props of the element it returns.

```ts
// tests/integration/modules/client/client-list.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '@/db/client';
import { clients } from '@/modules/client/models/client.model';
import { truncate } from '../../helpers/truncate';

vi.mock('server-only', () => ({}));
vi.mock('@/modules/shared/auth/require-permission', () => ({ guardPage: vi.fn() }));

import ClientsPage from '@/app/[companyId]/clients/page';

const COMPANY_A = '0192f3a0-0000-7000-8000-00000000c0a1';
const COMPANY_B = '0192f3a0-0000-7000-8000-00000000c0b2';

describe('ClientsPage', () => {
  beforeEach(() => truncate(clients));

  it('builds the search command with companyId from params', async () => {
    await db.insert(clients).values([
      { id: '0192f3a0-0000-7000-8000-000000000001', companyId: COMPANY_A, name: 'Ana', status: 'active' },
      { id: '0192f3a0-0000-7000-8000-000000000002', companyId: COMPANY_B, name: 'Ana', status: 'active' },
    ]);

    const element = await ClientsPage({
      params: Promise.resolve({ companyId: COMPANY_A }),
      searchParams: Promise.resolve({ search: 'an' }),
    });

    expect(element.props.companyId).toBe(COMPANY_A);
    expect(element.props.items).toHaveLength(1);
    expect(element.props.meta.total).toBe(1);
  });
});
```

Minimum cases per module: the e2e flow above (4 tests) plus the isolation test; add one e2e test per page asserting the redirect when the permission is missing.
