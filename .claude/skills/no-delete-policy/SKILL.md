---
name: no-delete-policy
description: "No physical deletion policy for this Next.js + Drizzle project. Activates when implementing delete functionality, a delete Server Action or DELETE route handler, a repository delete method, a deactivation use case, or when a user asks to delete records. Records are NEVER physically deleted — always use a status column or soft delete."
license: MIT
metadata:
  author: project
---

# No Delete Policy

## When to Apply

Activate this skill when:

- Someone asks to implement a delete button, a `delete{Module}Action` or a `DELETE` route handler
- Creating a Service that would remove a record
- Adding a `delete()` method to a repository interface or calling `db.delete(...)`
- Any mention of deleting, removing, or destroying a record

## Fundamental Rule

**Records are NEVER physically deleted from the system.**

Instead, use deactivation (status column) or soft delete (`deleted_at` timestamp).

## Why

1. **Referential Integrity**: Records may have relations; physical deletion creates orphaned data
2. **Audit Trail**: Maintain complete operation history for compliance
3. **Data Recovery**: Allow restoring accidentally deactivated records
4. **Security**: Prevent accidental or malicious loss of critical data

## Correct Alternatives

### Option 1: Status Column (preferred)

Every module already ships with it (see `nextjs-module-models`). Deactivating is the **Actualizar Estado** use case.

```ts
// src/modules/client/models/client.model.ts
status: varchar('status', { length: 50 })
  .notNull()
  .default('active')
  .$type<'active' | 'inactive' | 'archived'>(),
```

```ts
// Deactivation goes through the existing use case — no new files
await createClientContainer(db).updateStatusService.execute(id, companyId, new UpdateStatusClientCommand('inactive'));
```

### Option 2: Soft Delete

Only when a record must disappear from every listing by default (e.g. drafts). The repository owns the default condition.

```ts
// Model
deletedAt: timestamp('deleted_at', { withTimezone: true }),
```

```ts
// Repository — every query applies the default condition; withTrashed is an explicit opt-in
import { and, eq, isNull } from 'drizzle-orm';

const notTrashed = isNull(clients.deletedAt);

async findById(id: string, companyId: string, { withTrashed = false } = {}): Promise<ClientRow | null> {
  const [row] = await this.db
    .select()
    .from(clients)
    .where(and(eq(clients.id, id), eq(clients.companyId, companyId), withTrashed ? undefined : notTrashed))
    .limit(1);
  return row ?? null;
}

async softDelete(row: ClientRow): Promise<void> {
  await this.db.update(clients).set({ deletedAt: new Date() }).where(eq(clients.id, row.id)); // never db.delete()
}
```

## Do NOT Implement

```ts
// ❌ NEVER — a delete Server Action
export async function deleteClientAction(companyId: string, id: string) { /* ... */ }

// ❌ NEVER — a DELETE route handler
export async function DELETE(request: Request) { /* ... */ }

// ❌ NEVER — a delete method in the repository interface
interface ClientRepository { delete(id: string): Promise<void>; }

// ❌ NEVER — outside seeds and test helpers
await db.delete(clients).where(eq(clients.id, id));
```

```tsx
// ❌ NEVER — a delete entry in the row menu
<DropdownMenuItem className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Eliminar</DropdownMenuItem>
```

## DO Implement

```ts
// ✅ Server Action — src/app/[companyId]/clients/actions.ts
export async function updateClientStatusAction(
  companyId: string,
  id: string,
  status: 'active' | 'inactive',
): Promise<ActionState> {
  try {
    await requirePermission(companyId, 'clients.update-status');
    if (!z.string().uuid().safeParse(id).success) return { status: 'error', message: 'Cliente no encontrado.' };

    const parsed = updateStatusClientSchema.safeParse({ status });
    if (!parsed.success) return { status: 'error', fieldErrors: parsed.error.flatten().fieldErrors };

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

```ts
// ✅ Service — src/modules/client/services/client-update-status.service.ts
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
// ✅ Repository — src/modules/client/repositories/drizzle-client.repository.ts
async updateStatus(row: ClientRow, command: UpdateStatusClientCommand): Promise<void> {
  await this.db.update(clients).set({ status: command.status }).where(eq(clients.id, row.id));
}
```

```ts
// ✅ Filter helpers — src/modules/client/repositories/client.filters.ts
export const clientFilters = {
  search: (value) => ilike(clients.name, `%${value}%`),
  status: (value) => eq(clients.status, value),
} satisfies FilterMap;

export const activeOnly = () => eq(clients.status, 'active');
export const inactiveOnly = () => eq(clients.status, 'inactive');
```

The list shows **all** records by default: `searchClientSchema` declares `status` as optional, `applyFilters` skips it when absent, and the UI offers a status `Select` (Todos / Activo / Inactivo). Use `activeOnly()` in queries that must only see live records (pickers, reports).

## Frontend

```tsx
// ❌ NEVER
<Button onClick={() => deleteClient(client.id)} variant="destructive">
  <Trash2 /> Eliminar
</Button>

// ✅ ALWAYS
<Button onClick={() => handleToggleStatus(client)} variant="outline">
  <Archive /> Desactivar
</Button>
```

In tables the toggle lives in the row `DropdownMenu`, last item after the separator (see `nextjs-modular-frontend`):

```tsx
<DropdownMenuSeparator />
<DropdownMenuItem onClick={() => handleToggleStatus(client)}>
  <Power className="mr-2 h-4 w-4" />
  {client.status === 'active' ? 'Inactivar' : 'Activar'}
</DropdownMenuItem>
```

## Tests

```ts
// ✅ Unit — test deactivation, not deletion
it('can deactivate a client', async () => {
  const repository = new FakeClientRepository([buildClient({ id: clientId, companyId, status: 'active' })]);
  const service = new ClientUpdateStatusService(repository);

  const result = await service.execute(clientId, companyId, new UpdateStatusClientCommand('inactive'));

  expect(result.status).toBe('inactive');
  expect(repository.rows).toHaveLength(1); // still there
});
```

```ts
// ✅ Integration — the filter hides, it does not remove
it('does not show inactive clients when filtering by active', async () => {
  await createClient(db, { companyId, status: 'active', name: 'Active' });
  await createClient(db, buildInactiveClient({ companyId, name: 'Inactive' }));

  const { data, total } = await createClientContainer(db).searchService.execute(
    new SearchClientCommand({ filters: { status: 'active' }, companyId }),
  );

  expect(total).toBe(1);
  expect(data[0].name).toBe('Active');
  expect(await db.$count(clients, eq(clients.companyId, companyId))).toBe(2);
});
```

## Exceptions (Physical Deletion IS Allowed)

Only when explicitly documented and approved:

1. **Session tokens** — temporary data with no historical value
2. **Test/seed data** — clearly marked as disposable (`tests/helpers/truncate.ts`, `src/db/seed/`)
3. **Explicit business requirement** — documented with justification and approval
4. **Tables owned by better-auth** (`session`, `verification`, `account`) — framework-managed; the library deletes expired rows itself and they must not be altered

If implementing an exception:

```ts
/**
 * EXCEPTION: Physical deletion allowed.
 * Justification: Session tokens — temporary, no historical value.
 * Approved by: [Name] - [Date]
 */
export const sessionTokens = pgTable('app_session_tokens', {
  // Physical deletion permitted here
});
```
