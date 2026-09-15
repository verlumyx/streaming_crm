# Mapa Laravel → Next.js

Este proyecto (`streaming_crm`) es la reescritura en Next.js del CRM `code_base`
(Laravel 12 + Inertia/React). Este documento es el **único** lugar del repo donde se
menciona Laravel: sirve para traducir mentalmente la documentación y las skills
heredadas. Las skills en `.claude/skills/` ya están escritas en términos de Next.js.

## Stack destino

| Área | Elección |
|---|---|
| Framework | Next.js (App Router), TypeScript, `pnpm` |
| Mutaciones | Server Actions (`'use server'`), sin Route Handlers para CRUD |
| Base de datos | PostgreSQL + Drizzle ORM (`drizzle-kit` para migraciones) |
| Auth / multi-tenant | better-auth (email + contraseña, 2FA, plugin `admin`); membresía y rol por empresa en la tabla propia `user_company` |
| Validación | Zod (mensajes en español) |
| UI | Tailwind CSS v4 + shadcn/ui + lucide-react + sonner |
| Tests | Vitest (unit + integration), Playwright (e2e) |
| IDs | UUID v7 generados en el cliente para entidades principales |
| URLs | Prefijo `/{companyId}/...` en todas las rutas de módulo |

## Mapa de capas

| Laravel (`code_base`) | Next.js (`streaming_crm`) |
|---|---|
| `app/Modules/{Module}/` | `src/modules/{module-name}/` (dominio, aplicación, infraestructura, UI) |
| `{Module}GetController` (`index`, `create`, `show`, `edit`) | `src/app/[companyId]/{module-name}s/page.tsx`, `create/page.tsx`, `[id]/page.tsx`, `[id]/edit/page.tsx` (Server Components `async`) |
| `PostController` / `PutController` / `UpdateStatusController` | `src/app/[companyId]/{module-name}s/actions.ts`: `create{Module}Action`, `update{Module}Action`, `update{Module}StatusAction` |
| Form Request `rules()` + `messages()` | Zod schema en `validation/*.schema.ts` |
| Form Request `authorize()` | `await requirePermission(companyId, '{module}.{action}')` como primera línea de la action |
| `abort_unless($user->hasPermission(...), 403)` | `await guardPage(companyId, '{module}.{action}')` como primera línea de la page |
| `DB::transaction()` + `try/catch` | `db.transaction(async (tx) => create{Module}Container(tx)...)` dentro de `try/catch`; `redirect()` fuera del `try` |
| `redirect()->route(...)->with('success', ...)` | `revalidatePath()` + `setFlash('success', ...)` + `redirect({module}Routes.index(companyId))` |
| `redirect()->back()->with('error', ...)` | `return { status: 'error', message }` (`ActionState`) consumido por `useActionState` → toast |
| API Resource `toArray()` | `serializers/{module-name}.serializer.ts`: `to{Module}Dto(row)` (JSON-safe, sin `Date`) |
| Command (`readonly` + `fromRequest`) | Clase con campos `readonly` + `static fromInput(input, companyId)` |
| Eloquent Model + migration + factory | Drizzle `pgTable('app_...')` + `relations()` + `drizzle-kit generate` + `tests/factories/*.factory.ts` |
| `RepositoryInterface` / `Repository extends Filters` | `interface {Module}Repository` + `Drizzle{Module}Repository` que compone `applyFilters(filterMap, filters)` |
| `EloquentQueryFilters` | `src/modules/shared/infrastructure/drizzle-query-filters.ts` |
| Exceptions | Clases que extienden `DomainError` |
| `{Module}ServiceProvider` (bindings + rutas) | `container.ts` (factory de servicios); las rutas son las carpetas del App Router |
| `routes.php` + regex UUID | Carpetas bajo `src/app/[companyId]/`; `id` validado con `z.string().uuid()` → `notFound()` |
| Wayfinder / `route()` | `src/modules/{module-name}/routes.ts` (builders de URL tipados) |
| Prefijo `{company}` + middleware `company.access` | `src/app/[companyId]/layout.tsx` → `requireCompanyAccess(companyId)` (lee `user_company` + `app_companies`) |
| `User::hasPermission()` (rol por company, `permission_type = 'all'`) | `hasPermission(companyId, action)` en `shared/auth`, con `React.cache` por request; misma semántica de `'all'` |
| `seed_initial_modules.sql` / `seed_initial_menus.sql` / `MenuSeeder` | `src/modules/{module-name}/permissions.ts` + `shared/permissions/registry.ts` + `shared/menu/menu-registry.ts` + `pnpm db:seed` |
| Código secuencial con `lockForUpdate()` | `tx.select()...orderBy(desc(code)).limit(1).for('update')` dentro de la transacción de la action |
| Inertia `useForm`, `router.get/put/visit`, `<Link>` | `useActionState` + `useTransition`, `useRouter().push`, `next/link` |
| Pest unit / feature | Vitest unit (fake repository) + Vitest integration (DB de test) + Playwright e2e |
| Laravel scheduler / comando artisan | `src/scripts/*.ts` ejecutado por un script `pnpm` + cron |
| `config('sales.grace_period_days')` | `src/config/sales.ts` → `salesConfig.gracePeriodDays` (desde env, default 3) |
| API móvil Sanctum (`/api/login`, `/api/logout`, `/api/me`, `/api/companies/{company}/context|menu`) | Route Handlers en `src/app/api/**` + módulo `src/modules/api-auth` (tokens Bearer propios en `app_api_tokens`, solo el SHA-256; máximo 2 dispositivos; `throttle:10,1` en memoria). Es la única excepción a "sin Route Handlers": clientes externos, no CRUD |

## Mapa de skills

| Skill origen (Laravel) | Skill destino (Next.js) |
|---|---|
| `laravel-modular-architecture` | `nextjs-modular-architecture` |
| `laravel-module-controllers` | `nextjs-module-pages` (GET) + `nextjs-module-actions` (mutaciones) |
| `laravel-module-requests` | `nextjs-module-validation` |
| `laravel-module-resources` | `nextjs-module-serializers` |
| `laravel-module-services` | `nextjs-module-services` |
| `laravel-module-repositories` | `nextjs-module-repositories` |
| `laravel-module-commands` | `nextjs-module-commands` |
| `laravel-module-models` | `nextjs-module-models` |
| `laravel-module-exceptions` | `nextjs-module-exceptions` |
| `laravel-module-sequential-code` | `nextjs-module-sequential-code` |
| `react-modular-frontend` | `nextjs-modular-frontend` |
| `no-delete-policy` | `no-delete-policy` |

No se migraron `pest-testing`, `tailwindcss-development`, `wayfinder-development` ni
`inertia-react-development`: eran referencia de stack, no reglas de desarrollo de módulos.

## Inconsistencias del origen corregidas en la migración

1. `react-modular-frontend/SKILL.md` declaraba `name: hexagonal-frontend` (distinto de su carpeta). Ahora `name` coincide con la carpeta en todas las skills.
2. El template `UpdateStatus{Module}Command` tenía el argumento `status` duplicado y una propiedad `id` que los Update commands no llevan. Ahora solo transporta `status`.
3. `laravel-module-sequential-code` resolvía `companyId` desde `session('current_company_id')`, contradiciendo la regla de repositories ("la company viene del parámetro de ruta, nunca de la sesión"). Ahora siempre viene del segmento `[companyId]` de la URL.
4. El frontend usaba permisos `.view` / `.edit`, mientras backend y seeds usaban `.show` / `.update`. Se estandariza en `list`, `create`, `show`, `update`, `update-status`.
5. El hook de formulario generaba el id con `crypto.randomUUID()` (v4) aunque la regla exige UUID v7. Ahora se usa `uuidv7()` de `src/modules/shared/uuid.ts`.
6. `no-delete-policy` estaba escrita en un estilo distinto (UseCase / entidad / `Deactivate*Controller`). Se normaliza al patrón del proyecto: `update{Module}StatusAction` + `{Module}UpdateStatusService`.
7. Los permisos de reportes (`reports.service_plan`, `reports.expirations`) usan snake_case mientras el resto usa kebab-case. Se conservan tal cual por ser decisión de dominio; tenerlo presente al sembrar permisos.
