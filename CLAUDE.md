# streaming_crm

CRM para la venta y gestión de cuentas de streaming (clientes, catálogo de servicios y planes, inventario de cuentas y perfiles, ventas, finanzas, soporte). Multi-tenant por compañía.

## Stack

- **Next.js** (App Router) + **TypeScript**, package manager **pnpm**.
- **Server Actions** para toda mutación. No hay Route Handlers ni `fetch` cliente para CRUD de módulos.
- **PostgreSQL + Drizzle ORM**; migraciones con `drizzle-kit`. Tablas de la app con prefijo `app_`.
- **better-auth** (email + contraseña, 2FA, plugin `admin`). La membresía usuario ↔ empresa, su estado y el rol por empresa viven en la tabla propia `user_company`. Todas las rutas de módulo viven bajo `/{companyId}/...`.
- **Zod** para validación (mensajes en español).
- **Tailwind CSS v4 + shadcn/ui** (`src/components/ui/`), `lucide-react`, `sonner`.
- **Vitest** (unit + integration) y **Playwright** (e2e).
- IDs **UUID v7** generados en el cliente para entidades principales (`uuidv7()` de `@/modules/shared/uuid`).

Documentación de dominio en `docs/` (`estructura.md`, `modulos.md`, `guia.md`, `reporte-*.md`). `docs/mapa-laravel-nextjs.md` traduce la terminología del proyecto original.

## Skills Activation

This project has domain-specific skills available. You MUST activate the relevant skill whenever you work in that domain — don't wait until you're stuck.

- `nextjs-modular-architecture` — Activates when creating a new module, defining layer structure, naming conventions, dependency rules, the module container, registering permissions/menu, or writing architecture-specific tests. Entry point for everything else.
- `nextjs-module-pages` — Activates when creating or modifying `page.tsx` files (Listar, Crear form, Ver, Editar form) under `src/app/[companyId]/{module}s/`.
- `nextjs-module-actions` — Activates when creating or modifying Server Actions (`create`, `update`, `updateStatus`) in `src/app/[companyId]/{module}s/actions.ts`.
- `nextjs-module-validation` — Activates when creating or modifying Zod schemas (Create, Update, UpdateStatus, Search) inside any module's `validation/` folder.
- `nextjs-module-serializers` — Activates when creating or modifying `to{Module}Dto` serializers and DTO types inside any module's `serializers/` folder.
- `nextjs-module-services` — Activates when creating or modifying CreateService, UpdateService, UpdateStatusService, FindService, or SearchService inside any module's `services/` folder.
- `nextjs-module-repositories` — Activates when creating or modifying repository interfaces, filter maps, or Drizzle repository implementations inside any module's `repositories/` folder.
- `nextjs-module-commands` — Activates when creating or modifying Command DTOs (Create, Update, UpdateStatus, Search) inside any module's `commands/` folder.
- `nextjs-module-models` — Activates when creating or modifying Drizzle table definitions, relations, migrations, or factories inside any module's `models/` folder. All models use UUID v7 as primary key.
- `nextjs-module-exceptions` — Activates when creating or modifying domain exception classes inside any module's `exceptions/` folder or `shared/exceptions/`.
- `nextjs-module-sequential-code` — Activates when adding an auto-generated human-readable code (e.g. `CLI000001`): a module-prefixed, zero-padded sequential identifier generated on the server and unique per company.
- `nextjs-modular-frontend` — Activates when creating React components, hooks, Context providers, or client-side forms/lists inside any module's `ui/` folder, or registering permissions and menu entries for a new module.
- `no-delete-policy` — Activates whenever implementing delete functionality. Records are NEVER physically deleted.

## Component Creation

When asked to create a React/TypeScript component, follow these rules:

### 1. Check Before Creating
- **ALWAYS** search for an existing component before creating a new one.
- Check `src/components/ui/` for shared UI primitives (shadcn/ui).
- Check `src/modules/[module]/ui/components/` for module-specific components.

### 2. Decide Where the Component Lives
- **Module-specific** (used only within one module): `src/modules/[module]/ui/components/[Module][Name].tsx`
- **Global/shared** (used across multiple modules): `src/components/[Name].tsx`
- **UI primitives** (buttons, inputs, etc.): use existing shadcn/ui components from `src/components/ui/` — do NOT recreate them.

### 3. Use the Context API Pattern for Forms
- Form components inside a module **must not receive props directly** — they consume the `[Module]FormContext` via `use[Module]FormContext()`.
- The hook is instantiated in the client page component (`[Module]Create.tsx` / `[Module]Edit.tsx`) and passed to the `[Module]FormProvider`.
- Activate `nextjs-modular-frontend` skill for the full Context API pattern.

### 4. TypeScript
- All components must be typed. The entity type is the `[Module]Dto` exported by `src/modules/[module]/serializers/`. UI-only types (`Filters`, `Meta`) go in `src/modules/[module]/ui/types/[Module].ts`; shared types in `src/types/`.
- Props interfaces go at the top of the file.

### 5. Styling
- Use Tailwind CSS utility classes.
- Use shadcn/ui components as building blocks (`Button`, `Input`, `Card`, `Label`, etc.).
- Follow the existing visual style of sibling components.

### 6. No Delete Buttons
- Never add a delete/remove button to a component. Use deactivation instead. Activate `no-delete-policy` skill.

### 7. Routes in Components
- Never hardcode URLs. Use the module's typed builders from `src/modules/[module]/routes.ts` (`clientRoutes.index(companyId)`, etc.).

### 8. Server / Client Boundary
- `page.tsx`, `layout.tsx` and everything outside `ui/` are Server Components. Add `'use client'` only to leaf interactive components and hooks.
- Only JSON-safe DTOs cross the boundary: never pass a Drizzle row, a `Date` or a class instance as a prop.
- `companyId` reaches client components as a prop from the page, never from a global store.

## Conventions

- You must follow all existing code conventions used in this application. When creating or editing a file, check sibling files for the correct structure, approach, and naming.
- Use descriptive names for variables and methods. For example, `isRegisteredForDiscounts`, not `discount()`.
- Check for existing components to reuse before writing a new one.
- File naming: non-component TypeScript files are kebab-case with a layer suffix (`client-create.service.ts`); React components are PascalCase (`ClientList.tsx`).
- One module = one folder under `src/modules/` plus its routes folder under `src/app/[companyId]/`.
- Imports via the `@/` alias. Never climb out of a module with relative paths.

## Data Rules

- Records are never physically deleted (`no-delete-policy`).
- Every table is scoped by `company_id`; the company always comes from the `[companyId]` URL segment, never from cookies or session inside services/repositories.
- Every module model is re-exported from `src/db/schema.ts`.
- Every page and action is guarded by exactly one `{module}.{action}` permission; permissions and menu entries are declared in registries and seeded with `pnpm db:seed`.

## Testing (mandatory)

- Every code change adds or updates automated tests: Vitest unit tests (services with an in-memory fake repository) and Vitest integration tests (actions/pages against the test database). New pages get a Playwright e2e spec.
- Do not create verification scripts when tests cover that functionality. Unit and integration tests are more important.
- Never delete or skip tests without approval.
- Run the narrowest command that proves the change: `pnpm vitest run <file>`, `pnpm playwright test <spec>`.

## Application Structure & Architecture

- Stick to the existing directory structure; don't create new base folders without approval.
- Do not change the application's dependencies without approval.

## Commands

```
pnpm dev            # dev server
pnpm build          # production build
pnpm lint           # eslint
pnpm typecheck      # tsc --noEmit
pnpm test           # vitest run
pnpm test:e2e       # playwright test (PLAYWRIGHT_BASE_URL=http://localhost:3001 when dev runs on another port)
pnpm db:generate    # drizzle-kit generate
pnpm db:migrate     # drizzle-kit migrate
pnpm db:seed        # seed modules, permissions and menu from the registries
```

## Documentation Files

- You must only create documentation files if explicitly requested by the user.

## Replies

- Be concise in your explanations — focus on what's important rather than explaining obvious details.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
