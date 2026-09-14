---
name: nextjs-module-actions
description: "Guide for creating Server Actions (mutations: create, update, updateStatus) in the modular Next.js architecture. Activates when creating or modifying src/app/[companyId]/{module-name}s/actions.ts, any 'use server' file, or when wiring useActionState/startTransition forms to a module action."
license: MIT
metadata:
  author: project
---

# Next.js Module — Server Actions

Server Actions are thin. They **never contain business logic**. Their only job is to check the permission, validate the input, build a Command, delegate to a Service and return a serializable `ActionState` or redirect.

They are the **only mutation channel** of the project: no Route Handlers (`route.ts`) and no client-side `fetch` for module CRUD.

## Location

```
src/app/[companyId]/{module-name}s/
└── actions.ts      — 'use server': create{Module}Action, update{Module}Action, update{Module}StatusAction
```

For the `Client` module: `src/app/[companyId]/clients/actions.ts` exporting `createClientAction`, `updateClientAction`, `updateClientStatusAction`.

## Rules

1. **Never** put business logic in an action.
2. The file starts with `'use server'`. Every exported function is a public endpoint: validate everything, trust nothing from `FormData`.
3. Get services from `create{Module}Container(tx | db)` — never instantiate a Service or a Repository, and never call `container.repository` from an action.
4. Always build the Command inside the action (`CreateClientCommand.fromInput(parsed.data, companyId)`) before passing it to the Service.
5. Every action returns a **serializable `ActionState`** (`{ status, message?, fieldErrors? }`) or redirects. Never return a row, a `Date`, a class instance or an `Error`.
6. Never throw for an expected failure: `toActionError()` maps `DomainError` and `ForbiddenError` to an error state. Unknown errors are **rethrown on purpose** so they reach the Next.js error boundary and the logs.
7. Any action that touches **several tables** (create/update that write a parent and its children) wraps the service call in `db.transaction(async (tx) => ...)` and passes `tx` to `create{Module}Container(tx)`. A single atomic `UPDATE` (`updateStatus`) does not open a transaction.
8. `revalidatePath()` after **every** successful mutation, before redirecting, so the listing shows fresh data.
9. `redirect()` is **never inside `try/catch`** — it works by throwing, so a catch-all would swallow it. Place it after the `catch` block, together with `revalidatePath()` and `setFlash()`.
10. **Every action is permission-protected** with `await requirePermission(companyId, '{module}.{action}')` as its **first statement inside the `try`**.
11. `companyId` and `id` arrive as **bound arguments** from the URL — the action NEVER reads them from `FormData` (see below).

---

## ⚠️ CRITICAL: `companyId` / `id` are bound arguments, not form fields

Every module lives under `/[companyId]/...`, and `update`/`updateStatus` also carry the entity `id`. Both values come from the URL segments that the **page** already resolved, and are handed to the action through `Function.prototype.bind` in the form hook. A hidden `<input name="companyId">` is forbidden: the client could point the mutation at another company.

Signature convention for `useActionState`:

```
(companyId, _prev: ActionState, formData: FormData)          → create
(companyId, id, _prev: ActionState, formData: FormData)      → update
(companyId, id, status)                                      → updateStatus (no FormData)
```

```ts
// ui/hooks/useClientForm.ts — the hook binds the URL values, the form only sends fields
const [state, formAction, pending] = useActionState(
  client ? updateClientAction.bind(null, companyId, client.id) : createClientAction.bind(null, companyId),
  initialActionState,
);
```

```ts
// ui/hooks/useClientActions.ts — status toggle, called with plain arguments
startTransition(async () => {
  const result = await updateClientStatusAction(companyId, client.id, client.status === 'active' ? 'inactive' : 'active');
  if (result?.status === 'error') toast.error(result.message);
});
```

Rules of thumb:
- Validate `id` with `z.string().uuid()` right after the permission check; an invalid id returns `{ status: 'error', message: 'Cliente no encontrado.' }` — never reaches the database.
- The `id` of a **new** row travels in the form (`formData.get('id')`, generated client-side with `uuidv7()`), because it is data, not routing. It is validated by the Zod schema like any other field.
- Redirect targets are built with `clientRoutes.*(companyId, id)` — never a hardcoded string.

---

## ⚠️ CRITICAL: Permission checks (every action)

Access is controlled by permission **action strings** of the form `{module}.{action}`, where `{module}` is the plural, lowercase module slug used in URLs (`users`, `roles`, `clients`). The user's role is resolved per company by `hasPermission(companyId, action)` (wrapped in `React.cache`). A role with `permissionType === 'all'` (e.g. `Administrador`) passes every check automatically.

**Each action must enforce exactly one permission**, mapped as follows:

| Action | Use case | Permission action |
|---|---|---|
| `create{Module}Action` (store) | Crear | `{module}.create` |
| `update{Module}Action` (update) | Actualizar | `{module}.update` |
| `update{Module}StatusAction` (updateStatus) | Actualizar Estado | `{module}.update-status` |

- `await requirePermission(companyId, '{module}.create')` is the **first statement** inside the `try`, before validation and before any service call.
- `requirePermission` throws `ForbiddenError`; `toActionError` converts it into `{ status: 'error', message: 'No tienes permiso para realizar esta acción.' }`, which the form hook shows as a toast. **Do not build a friendly response yourself** — the shared helper is all an action needs.
- GET views (`index`, `create`, `show`, `edit`) are guarded by `guardPage()` in their `page.tsx` — see `nextjs-module-pages`. Actions never re-check a view permission.
- **Permissions must exist in `permissions.ts`** (`{MODULE}_MODULE.permissions`) and be seeded through `src/modules/shared/permissions/registry.ts` + `pnpm db:seed`. Without the seeded rows, only `permissionType === 'all'` roles can run the action.
- **Always add an integration test** asserting that a user lacking the permission gets an error state on each action, and that granting it allows the mutation.

---

## Fixed order inside every action

```
try {
  (1) await requirePermission(companyId, '{module}.{action}')
  (2) validate id with z.string().uuid()            (update / updateStatus only)
  (3) schema.safeParse(...)  → return { status: 'error', fieldErrors }
  (4) db.transaction(async (tx) => create{Module}Container(tx).xService.execute(...))
} catch (error) {
  return toActionError(error)
}
(5) revalidatePath(...)  →  await setFlash('success', ...)  →  redirect(...)     ← OUTSIDE try/catch
```

---

## actions.ts — full template

```ts
// src/app/[companyId]/clients/actions.ts
'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/db/client';
import { requirePermission } from '@/modules/shared/auth/require-permission';
import { toActionError, type ActionState } from '@/modules/shared/actions/action-state';
import { setFlash } from '@/modules/shared/flash/flash';
import { createClientSchema } from '@/modules/client/validation/create-client.schema';
import { updateClientSchema } from '@/modules/client/validation/update-client.schema';
import { updateStatusClientSchema } from '@/modules/client/validation/update-status-client.schema';
import { CreateClientCommand } from '@/modules/client/commands/create-client.command';
import { UpdateClientCommand } from '@/modules/client/commands/update-client.command';
import { UpdateStatusClientCommand } from '@/modules/client/commands/update-status-client.command';
import { createClientContainer } from '@/modules/client/container';
import { clientRoutes } from '@/modules/client/routes';

const uuid = z.string().uuid();
```

### createClientAction (Crear)

```ts
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

### updateClientAction (Actualizar)

Redirects to the **show** page of the updated row.

```ts
export async function updateClientAction(
  companyId: string,
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requirePermission(companyId, 'clients.update');

    if (!uuid.safeParse(id).success) {
      return { status: 'error', message: 'Cliente no encontrado.' };
    }

    const parsed = updateClientSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { status: 'error', fieldErrors: parsed.error.flatten().fieldErrors };
    }

    await db.transaction(async (tx) => {
      await createClientContainer(tx).updateService.execute(
        id,
        companyId,
        UpdateClientCommand.fromInput(parsed.data),
      );
    });
  } catch (error) {
    return toActionError(error);
  }

  revalidatePath(clientRoutes.index(companyId));
  revalidatePath(clientRoutes.show(companyId, id));
  await setFlash('success', 'Cliente actualizado correctamente.');
  redirect(clientRoutes.show(companyId, id));
}
```

### updateClientStatusAction (Actualizar Estado)

No `FormData` — it is called from `startTransition` with a plain `status` argument. No transaction — the service call is a single atomic update. After a successful status change, redirect to the **index** (not `show`) with a `success` flash; the layout's `<FlashToaster />` shows it as a toast.

```ts
export async function updateClientStatusAction(
  companyId: string,
  id: string,
  status: string,
): Promise<ActionState> {
  try {
    await requirePermission(companyId, 'clients.update-status');

    if (!uuid.safeParse(id).success) {
      return { status: 'error', message: 'Cliente no encontrado.' };
    }

    const parsed = updateStatusClientSchema.safeParse({ status });
    if (!parsed.success) {
      return { status: 'error', fieldErrors: parsed.error.flatten().fieldErrors };
    }

    await createClientContainer(db).updateStatusService.execute(
      id,
      companyId,
      UpdateStatusClientCommand.fromInput(parsed.data),
    );
  } catch (error) {
    return toActionError(error);
  }

  revalidatePath(clientRoutes.index(companyId));
  await setFlash('success', 'Estado del cliente actualizado correctamente.');
  redirect(clientRoutes.index(companyId));
}
```

> Only use `db.transaction()` when multiple writes must be atomic (e.g. `create`/`update` that touch several tables). `updateStatus` runs against `db` directly through `createClientContainer(db)`.

---

## `ActionState` contract

```ts
// src/modules/shared/actions/action-state.ts (shared — do not redefine per module)
export type ActionState = {
  status: 'idle' | 'error';
  message?: string;                                  // shown as toast.error
  fieldErrors?: Record<string, string[] | undefined>; // shown under each input
};
```

- `status: 'idle'` is the initial value passed to `useActionState`; a successful action never returns — it redirects.
- `fieldErrors` keys are the form field names (`parsed.error.flatten().fieldErrors` already produces that shape from the Zod schema).
- A module that needs an extra outcome (e.g. a conflict with a payload) extends the union in its own action return type, but the base fields stay the same so the shared form hook keeps working.

---

## Testing actions (Vitest integration)

Actions run against the test database (`DATABASE_URL_TEST`); the Next.js runtime modules and the shared auth/flash helpers are mocked. `redirect` is mocked to throw, mirroring its real behaviour, so a successful action is asserted with `rejects.toThrow('NEXT_REDIRECT')`.

```ts
// tests/integration/modules/client/client-actions.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { clients } from '@/modules/client/models/client.model';
import { ForbiddenError } from '@/modules/shared/exceptions/domain-error';
import { truncate } from '../../helpers/truncate';

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/navigation', () => ({
  redirect: vi.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
}));
vi.mock('@/modules/shared/auth/require-permission', () => ({ requirePermission: vi.fn() }));
vi.mock('@/modules/shared/flash/flash', () => ({ setFlash: vi.fn() }));

import { requirePermission } from '@/modules/shared/auth/require-permission';
import { setFlash } from '@/modules/shared/flash/flash';
import { createClientAction, updateClientStatusAction } from '@/app/[companyId]/clients/actions';

const COMPANY_ID = '0192f3a0-0000-7000-8000-00000000c001';
const CLIENT_ID = '0192f3a0-0000-7000-8000-000000000001';
const idle = { status: 'idle' } as const;

describe('client actions', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await truncate(clients);
  });

  it('creates the row and redirects', async () => {
    const formData = new FormData();
    formData.set('id', CLIENT_ID);
    formData.set('name', 'Ana');

    await expect(createClientAction(COMPANY_ID, idle, formData)).rejects.toThrow('NEXT_REDIRECT');

    const [row] = await db.select().from(clients).where(eq(clients.id, CLIENT_ID));
    expect(row?.companyId).toBe(COMPANY_ID);
    expect(setFlash).toHaveBeenCalledWith('success', 'Cliente creado correctamente.');
  });

  it('returns fieldErrors on invalid input', async () => {
    const formData = new FormData();
    formData.set('id', CLIENT_ID);
    formData.set('name', '');

    const result = await createClientAction(COMPANY_ID, idle, formData);

    expect(result.status).toBe('error');
    expect(result.fieldErrors?.name).toBeDefined();
    expect(await db.select().from(clients)).toHaveLength(0);
  });

  it('returns an error state when the permission is missing', async () => {
    vi.mocked(requirePermission).mockRejectedValueOnce(new ForbiddenError('clients.create'));
    const formData = new FormData();
    formData.set('id', CLIENT_ID);
    formData.set('name', 'Ana');

    const result = await createClientAction(COMPANY_ID, idle, formData);

    expect(result).toEqual({ status: 'error', message: 'No tienes permiso para realizar esta acción.' });
  });

  it('flips the status and redirects to the index', async () => {
    await db.insert(clients).values({ id: CLIENT_ID, companyId: COMPANY_ID, name: 'Ana', status: 'active' });

    await expect(updateClientStatusAction(COMPANY_ID, CLIENT_ID, 'inactive')).rejects.toThrow('NEXT_REDIRECT');

    const [row] = await db.select().from(clients).where(eq(clients.id, CLIENT_ID));
    expect(row?.status).toBe('inactive');
    expect(setFlash).toHaveBeenCalledWith('success', 'Estado del cliente actualizado correctamente.');
  });
});
```

Minimum cases per action: success (row written + flash + redirect), invalid input (`fieldErrors`, nothing written), missing permission (error state, nothing written), and for `update`/`updateStatus` an unknown or foreign-company id (`'Cliente no encontrado.'`).
