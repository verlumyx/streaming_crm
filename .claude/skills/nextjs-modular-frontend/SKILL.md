---
name: nextjs-modular-frontend
description: "Frontend rules for the modular Next.js App Router architecture (React 19, Server Components + Server Actions, shadcn/ui). Activates when creating a module's ui/ folder (components, contexts, hooks, types), the pages under src/app/[companyId]/{module}s/, or when registering permissions and the sidebar menu for a new module."
license: MIT
metadata:
  author: project
---

# Next.js Modular Frontend (App Router + React 19 + TypeScript)

## When to Apply

Activate this skill when:

- Creating a new module's frontend (pages, `ui/components`, `ui/hooks`, `ui/contexts`)
- Adding permissions and the sidebar entry for a new module
- Working with the Context API form pattern
- Creating custom hooks for list/form/actions

## Critical: Register Permissions and Menu When Creating a New Module

**MANDATORY**: create `src/modules/{module-name}/permissions.ts` with the 5 standard permissions and register it.

```ts
// src/modules/client/permissions.ts
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

Then:

1. Add it to `src/modules/shared/permissions/registry.ts` → `export const PERMISSION_REGISTRY = [USER_MODULE, ROLE_MODULE, CLIENT_MODULE] as const;`
2. Add the sidebar entry to `src/modules/shared/menu/menu-registry.ts` → `{ id: 'clients', label: 'Clientes', url: '/clients', permission: 'clients.list', icon: 'Users', order: 30, section: 'main' }`
3. Run `pnpm db:seed`.

The roles UI permissions tree reads from the registry — there is nothing to edit there.

## Module Directory Structure

```
src/app/[companyId]/clients/          Server Components (no 'use client')
├── page.tsx                          Listar   → renders <ClientList />
├── create/page.tsx                   Crear    → renders <ClientCreate />
├── [id]/page.tsx                     Ver      → renders <ClientCard />
├── [id]/edit/page.tsx                Editar   → renders <ClientEdit client={dto} />
└── actions.ts                        'use server': create / update / updateStatus

src/modules/client/ui/
├── components/
│   ├── ClientList.tsx                'use client' — table with filters + row DropdownMenu
│   ├── ClientForm.tsx                'use client' — shared form (uses Context)
│   ├── ClientCreate.tsx              'use client' — instantiates the hook + Provider (Crear)
│   ├── ClientEdit.tsx                'use client' — same for Editar
│   └── ClientCard.tsx                detail card (server-safe, no hooks)
├── contexts/
│   └── ClientFormContext.tsx         Context + Provider + Hook
├── hooks/
│   ├── useClientForm.ts              form state + useActionState
│   ├── useClientList.ts              filters and search (URL-driven)
│   └── useClientActions.ts           navigation actions
└── types/
    └── Client.ts                     ClientFilters, ClientMeta ONLY
```

Server/client split:

- Pages are **async Server Components**: they guard the permission, call the Service, serialize, and render a `ui/` component. They never hold state.
- `ui/components/*List.tsx`, `*Form.tsx`, `*Create.tsx`, `*Edit.tsx` and every hook start with `'use client'`.
- `companyId` **arrives as a prop from the page** (it is the `[companyId]` URL segment). Never read it from a global store or context.
- The entity type is `ClientDto`, imported from `@/modules/client/serializers/client.serializer`. `ui/types/Client.ts` holds only `ClientFilters` and `ClientMeta`.

## Index Page Template (server)

Full version in `nextjs-modular-architecture`. The page does the reading; the list component does the interaction.

```tsx
// src/app/[companyId]/clients/page.tsx
export default async function ClientsPage({ params, searchParams }: Props) {
  const { companyId } = await params;
  await guardPage(companyId, 'clients.list');

  const filters = searchClientSchema.parse(await searchParams);
  const { data, total } = await createClientContainer(db).searchService.execute(
    new SearchClientCommand({ filters: { search: filters.search, status: filters.status }, limit: filters.limit, offset: filters.offset, companyId }),
  );

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

## List Component Template

The list component is the heart of the module. It replaces individual icon buttons with one `DropdownMenu` per row, and includes the status toggle directly.

```tsx
// src/modules/client/ui/components/ClientList.tsx
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, Edit, Eye, Plus, Power, Search } from 'lucide-react';
import type { ClientDto } from '@/modules/client/serializers/client.serializer';
import type { ClientFilters, ClientMeta } from '../types/Client';
import { clientRoutes } from '@/modules/client/routes';
import { updateClientStatusAction } from '@/app/[companyId]/clients/actions';

interface ClientListProps {
  companyId: string;
  items: ClientDto[];
  meta: ClientMeta;
  filters: ClientFilters;
}

export function ClientList({ companyId, items, meta, filters: initialFilters }: ClientListProps) {
  const router = useRouter();
  const [filters, setFilters] = useState<ClientFilters>(initialFilters);
  const [isPending, startTransition] = useTransition();

  // The URL is the state: the server page re-renders with the new searchParams
  const handleSearch = () => router.push(clientRoutes.index(companyId, { ...filters, offset: 0 }));

  const handleClear = () => {
    setFilters({});
    router.push(clientRoutes.index(companyId));
  };

  // Toggle activo/inactivo — Server Action inside a transition, never fetch/axios
  const handleToggleStatus = (client: ClientDto) => {
    const next = client.status === 'active' ? 'inactive' : 'active';
    startTransition(async () => {
      const result = await updateClientStatusAction(companyId, client.id, next);
      if (result?.status === 'error') toast.error(result.message);
      // on success the action revalidates + redirects; <FlashToaster /> shows the flash
    });
  };

  const statusBadge = (status: ClientDto['status']) =>
    status === 'active' ? (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Activo</Badge>
    ) : (
      <Badge variant="secondary" className="bg-red-100 text-red-800 hover:bg-red-100">Inactivo</Badge>
    );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gestión de Clientes</h1>
          <p className="text-muted-foreground">Gestiona los clientes del sistema</p>
        </div>
        {/* Use router.push, NOT next/link nor <a href> */}
        <Button onClick={() => router.push(clientRoutes.create(companyId))}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Cliente
        </Button>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="search">Nombre</Label>
            <Input
              id="search"
              value={filters.search ?? ''}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Buscar por nombre"
            />
          </div>
          <div className="space-y-2">
            <Label>Estado</Label>
            <Select
              value={filters.status ?? 'all'}
              onValueChange={(value) => setFilters({ ...filters, status: value === 'all' ? undefined : value })}
            >
              <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Activo</SelectItem>
                <SelectItem value="inactive">Inactivo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={handleSearch}><Search className="mr-2 h-4 w-4" />Buscar</Button>
          <Button variant="outline" onClick={handleClear}>Limpiar</Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <div className="py-12 text-center">
              <p className="mb-4 text-muted-foreground">No se encontraron clientes.</p>
              <Button onClick={() => router.push(clientRoutes.create(companyId))}>
                <Plus className="mr-2 h-4 w-4" />
                Crear Primer Cliente
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Creado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell>{client.name}</TableCell>
                    <TableCell>{statusBadge(client.status)}</TableCell>
                    <TableCell>{new Date(client.createdAt).toLocaleDateString('es')}</TableCell>
                    <TableCell className="text-right">
                      {/* MANDATORY PATTERN: DropdownMenu, never individual buttons */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" disabled={isPending}>
                            Opciones <ChevronDown className="ml-1 h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(clientRoutes.show(companyId, client.id))}>
                            <Eye className="mr-2 h-4 w-4" />
                            Ver
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => router.push(clientRoutes.edit(companyId, client.id))}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleToggleStatus(client)}>
                            <Power className="mr-2 h-4 w-4" />
                            {client.status === 'active' ? 'Inactivar' : 'Activar'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{meta.total} registros</span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={meta.offset === 0}
            onClick={() => router.push(clientRoutes.index(companyId, { ...filters, offset: Math.max(0, meta.offset - meta.limit) }))}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!meta.hasMore}
            onClick={() => router.push(clientRoutes.index(companyId, { ...filters, offset: meta.offset + meta.limit }))}
          >
            Siguiente
          </Button>
        </div>
      </div>
    </div>
  );
}
```

### List component rules

- **NEVER use `next/link` or `<a>`** inside table rows / `DropdownMenuItem` — always `router.push()` from `useRouter()` (`next/navigation`).
- **NEVER use individual icon buttons** (Eye, Edit separately) — always group them in a `DropdownMenu`.
- The dropdown structure is fixed: Ver → Editar → `<DropdownMenuSeparator />` → Activar/Inactivar.
- `handleToggleStatus` inverts the current status and calls `updateClientStatusAction` inside `startTransition`.
- If the record cannot be edited (e.g. the `Administrador` role), wrap Editar and Inactivar in `{condition && (<>...</>)}`.
- Dates arrive as ISO strings in the DTO; the component formats them (`toLocaleDateString('es')` or a shared `formatDate`).

## Create Page Template

Hooks cannot run in a Server Component, so the page only guards and delegates to a small client component that instantiates the hook and provides the context.

```tsx
// src/app/[companyId]/clients/create/page.tsx — Server Component
import { guardPage } from '@/modules/shared/auth/require-permission';
import { ClientCreate } from '@/modules/client/ui/components/ClientCreate';

type Props = { params: Promise<{ companyId: string }> };

export default async function ClientCreatePage({ params }: Props) {
  const { companyId } = await params;
  await guardPage(companyId, 'clients.create');

  return <ClientCreate companyId={companyId} />;
}
```

```tsx
// src/modules/client/ui/components/ClientCreate.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClientForm } from './ClientForm';
import { ClientFormProvider } from '../contexts/ClientFormContext';
import { useClientForm } from '../hooks/useClientForm';

export function ClientCreate({ companyId }: { companyId: string }) {
  const formMethods = useClientForm({ mode: 'create', companyId });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Crear Cliente</h1>
      <Card>
        <CardHeader><CardTitle>Información del Cliente</CardTitle></CardHeader>
        <CardContent>
          <ClientFormProvider value={formMethods}>
            <ClientForm />
          </ClientFormProvider>
        </CardContent>
      </Card>
    </div>
  );
}
```

`ClientEdit.tsx` is identical with `useClientForm({ mode: 'edit', companyId, client })`, where `client: ClientDto` comes from `[id]/edit/page.tsx` (`guardPage(companyId, 'clients.update')` → `findService` → `toClientDto`).

## Context API Template

```tsx
// src/modules/client/ui/contexts/ClientFormContext.tsx
'use client';

import { createContext, useContext } from 'react';
import { useClientForm } from '../hooks/useClientForm';

type ClientFormContextType = ReturnType<typeof useClientForm>;

const ClientFormContext = createContext<ClientFormContextType | null>(null);

export function ClientFormProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: ClientFormContextType;
}) {
  return <ClientFormContext.Provider value={value}>{children}</ClientFormContext.Provider>;
}

export function useClientFormContext(): ClientFormContextType {
  const context = useContext(ClientFormContext);
  if (!context) {
    throw new Error('useClientFormContext must be used within ClientFormProvider');
  }
  return context;
}
```

## Form Hook Template

```ts
// src/modules/client/ui/hooks/useClientForm.ts
'use client';

import { useActionState, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { initialActionState } from '@/modules/shared/actions/action-state';
import { uuidv7 } from '@/modules/shared/uuid';
import type { ClientDto } from '@/modules/client/serializers/client.serializer';
import { createClientAction, updateClientAction } from '@/app/[companyId]/clients/actions';

type ClientFormData = {
  id: string;
  name: string;
  status: 'active' | 'inactive';
};

interface ClientFormOptions {
  mode: 'create' | 'edit';
  companyId: string;
  client?: ClientDto;
}

export function useClientForm({ mode, companyId, client }: ClientFormOptions) {
  const [data, setDataState] = useState<ClientFormData>(() => ({
    id: client?.id ?? uuidv7(), // UUID v7 generated on the client, required by createClientSchema
    name: client?.name ?? '',
    status: client?.status ?? 'active',
  }));

  // companyId / id are bound here — the action never reads them from FormData
  const action =
    mode === 'create'
      ? createClientAction.bind(null, companyId)
      : updateClientAction.bind(null, companyId, client!.id);

  const [state, formAction, pending] = useActionState(action, initialActionState);

  useEffect(() => {
    if (state.status === 'error' && state.message) toast.error(state.message);
  }, [state]);

  const setData = <K extends keyof ClientFormData>(key: K, value: ClientFormData[K]) =>
    setDataState((prev) => ({ ...prev, [key]: value }));

  return { mode, data, setData, formAction, pending, errors: state.fieldErrors ?? {} };
}
```

On success the action calls `revalidatePath` + `setFlash('success', ...)` + `redirect(...)`, so the hook has no `onSuccess`: the redirect lands on the index/show page and `<FlashToaster />` (in `src/app/[companyId]/layout.tsx`) shows the toast.

## Form Component Template (uses Context)

```tsx
// src/modules/client/ui/components/ClientForm.tsx
'use client';

import { useClientFormContext } from '../contexts/ClientFormContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function ClientForm() {
  const { data, setData, formAction, pending, errors } = useClientFormContext();

  return (
    <form action={formAction} className="space-y-4">
      {/* Draft id generated client-side; the pre-rendered value is replaced on the client */}
      <input type="hidden" name="id" value={data.id} suppressHydrationWarning />

      <div className="space-y-2">
        <Label htmlFor="name">Nombre</Label>
        <Input
          id="name"
          name="name"
          value={data.name}
          onChange={(e) => setData('name', e.target.value)}
          placeholder="Nombre del cliente"
          aria-invalid={Boolean(errors.name)}
        />
        {errors.name?.[0] && <p className="text-sm text-destructive">{errors.name[0]}</p>}
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? 'Guardando...' : 'Guardar'}
      </Button>
    </form>
  );
}
```

Every field the schema validates needs a `name` attribute — `FormData` is what the action parses. Controlled `value`/`onChange` keeps the UI state for re-renders after a validation error.

## Actions Hook Template

```ts
// src/modules/client/ui/hooks/useClientActions.ts
'use client';

import { useRouter } from 'next/navigation';
import { clientRoutes } from '@/modules/client/routes';

export function useClientActions(companyId: string) {
  const router = useRouter();

  const goToIndex = () => router.push(clientRoutes.index(companyId));
  const goToCreate = () => router.push(clientRoutes.create(companyId));
  const goToShow = (id: string) => router.push(clientRoutes.show(companyId, id));
  const goToEdit = (id: string) => router.push(clientRoutes.edit(companyId, id));

  return { goToIndex, goToCreate, goToShow, goToEdit };
}
```

## List Hook Template

```ts
// src/modules/client/ui/hooks/useClientList.ts
'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { clientRoutes } from '@/modules/client/routes';
import type { ClientFilters } from '../types/Client';

export function useClientList(companyId: string, initialFilters: ClientFilters) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<ClientFilters>(initialFilters);

  const search = () => router.push(clientRoutes.index(companyId, { ...filters, offset: 0 }));

  const resetFilters = () => {
    setFilters({});
    router.push(clientRoutes.index(companyId));
  };

  // Keeps the current URL filters and only moves the offset
  const goToOffset = (offset: number) =>
    router.push(clientRoutes.index(companyId, { ...Object.fromEntries(searchParams), offset }));

  return { filters, setFilters, search, resetFilters, goToOffset };
}
```

## Types Template

```ts
// src/modules/client/ui/types/Client.ts
// The entity type is ClientDto from '@/modules/client/serializers/client.serializer' — do not redeclare it here.

export interface ClientMeta {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface ClientFilters {
  search?: string;
  status?: string;
  limit?: number;
  offset?: number;
}
```

## Rules

- Use Context API to share form state — avoid prop drilling
- Hook instantiated in the client page component (`ClientCreate` / `ClientEdit`), passed via Provider to child components
- Components consume context with `useClientFormContext()`
- Filter navigation is `router.push(clientRoutes.index(companyId, filters))` — the URL is the state and the server page re-renders with the new `searchParams`
- All form submissions go through `<form action={formAction}>` + `useActionState`
- Do NOT use `fetch()`, `axios`, Route Handlers or any client-side data fetching for module CRUD — Server Actions and server pages only
- All deactivation uses `updateClientStatusAction`, never a delete action (see `no-delete-policy` skill)
- `'use client'` only on leaf interactive components and hooks; pages, layouts and `ClientCard` stay server-safe
- Props crossing the server → client boundary must be DTOs from the serializer (no Drizzle rows, no `Date`)
- `companyId` is a prop from the page, never from a global store
- Ids are generated client-side with `uuidv7()` from `@/modules/shared/uuid` — never the Web Crypto `randomUUID` helper (it produces v4)
- URLs only via `routes.ts` builders (`clientRoutes.*`), never hardcoded strings
- Toasts: `sonner` — `toast.error(state.message)` for action errors in the hook; success messages come from the flash cookie rendered by `<FlashToaster />` in the company layout

### Navigation in tables/lists

- **NEVER nest `<a>` or `next/link`** inside `DropdownMenuItem` or table rows — always `router.push()`.
- `next/link` is fine for standalone links (breadcrumbs, cards, sidebar).
- **NEVER use individual icon buttons** (Eye, Edit, etc.) per row — always use a `DropdownMenu`.

### Status toggle

- `handleToggleStatus` runs `updateClientStatusAction(companyId, client.id, next)` inside `startTransition` from `useTransition`.
- The payload is `{ status: current === 'active' ? 'inactive' : 'active' }`.
- After success the action revalidates the index path and redirects to `clientRoutes.index(companyId)` with a `success` flash shown by `<FlashToaster />`.
- On `result.status === 'error'` show `toast.error(result.message)`.
- Do NOT use optimistic UI updates — rely on the redirect/revalidate to refresh the list.

### DropdownMenu structure (fixed order)

```
Ver
Editar
─────────── (DropdownMenuSeparator)
Activar / Inactivar
```

If a row should not be editable or have its status changed (e.g. the `Administrador` role), wrap those items in `{condition && (<>...</>)}`.
