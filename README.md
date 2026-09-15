# streaming_crm

CRM para la venta y gestión de cuentas de streaming. Multi-tenant por compañía.

Next.js (App Router) + TypeScript · PostgreSQL + Drizzle ORM · better-auth · Tailwind CSS v4 + shadcn/ui · Vitest + Playwright.

## Requisitos

- Node.js 22+
- pnpm 12 (`corepack enable` o `npm i -g pnpm`)
- Docker con Docker Compose

## Levantar la aplicación

```bash
# 1. Instalar dependencias
pnpm install

# 2. Variables de entorno
cp .env.example .env
#    Cambia BETTER_AUTH_SECRET por un valor aleatorio:
#    openssl rand -base64 32

# 3. Levantar PostgreSQL (también crea las bases de datos de test)
docker compose up -d

# 4. Aplicar migraciones (base de la app y base de test)
pnpm db:migrate
pnpm db:migrate --test

# 5. Sembrar módulos, permisos, menú, empresa inicial y usuario administrador
pnpm db:seed

# 6. Servidor de desarrollo
pnpm dev
```

La aplicación queda en http://localhost:3000.

### Usuario inicial

| Email                 | Password   |
| --------------------- | ---------- |
| `admin@miempresa.com` | `password` |

Pertenece a la empresa **Mi Empresa** y es propietario del sistema. `pnpm db:seed` es idempotente: puede volver a ejecutarse para registrar permisos o menús nuevos sin duplicar la empresa inicial.

## Base de datos

Postgres corre en Docker (`streaming_crm_postgres`):

| Campo         | Valor           |
| ------------- | --------------- |
| Host          | `localhost`     |
| Puerto        | `5436`          |
| Usuario       | `streaming_crm` |
| Password      | `streaming_crm` |
| Base de datos | `streaming_crm` |

Bases adicionales con las mismas credenciales:

- `streaming_crm_test`: tests de integración (se vacían en cada ejecución).
- `streaming_crm_test_a` … `streaming_crm_test_f`: una por proceso de test en paralelo.

```bash
# Consola psql
docker exec -it streaming_crm_postgres psql -U streaming_crm -d streaming_crm
```

Las tablas de la app llevan el prefijo `app_`. Las de better-auth no lo llevan: `users`, `sessions`, `accounts`, `two_factors` y `verifications`.

> Las bases de test las crea `docker/postgres/init/01-test-db.sql` **solo al crear el volumen**. Si el volumen ya existía sin ellas, recréalo con `docker compose down -v && docker compose up -d` (esto borra los datos locales).

## Variables de entorno

| Variable                      | Descripción                                                  |
| ----------------------------- | ------------------------------------------------------------ |
| `NEXT_PUBLIC_APP_URL`         | URL pública de la app                                        |
| `APP_TIMEZONE`                | Zona horaria para fechas de negocio (`America/Panama`)       |
| `DATABASE_URL`                | Conexión a la base de la app                                 |
| `DATABASE_URL_TEST`           | Conexión a la base de test (Vitest la usa automáticamente)   |
| `BETTER_AUTH_SECRET`          | Secreto de sesiones (mínimo 32 caracteres, aleatorio)        |
| `BETTER_AUTH_URL`             | URL base de better-auth (igual a la URL de la app)           |
| `BETTER_AUTH_TRUSTED_ORIGINS` | Orígenes adicionales permitidos, separados por coma          |
| `SALES_GRACE_PERIOD_DAYS`     | Días de gracia antes de expirar una venta vencida            |

### Puerto distinto de 3000

Si el 3000 está ocupado, `pnpm dev` usa el siguiente libre (p. ej. 3001). En ese caso ajusta `NEXT_PUBLIC_APP_URL` y `BETTER_AUTH_URL` a esa URL, o agrégala en `BETTER_AUTH_TRUSTED_ORIGINS`; si no, el login falla por origen no confiable.

## Tests

```bash
pnpm test                      # Vitest: unit + integración
pnpm test:unit                 # solo unit
pnpm test:integration          # solo integración (requiere la base de test migrada)
pnpm vitest run <archivo>      # un archivo

pnpm exec playwright install chromium   # solo la primera vez
pnpm test:e2e                            # Playwright (levanta `pnpm dev` si no está corriendo)
PLAYWRIGHT_BASE_URL=http://localhost:3001 pnpm test:e2e   # contra un dev server ya levantado en otro puerto
```

Los specs e2e inician sesión con el usuario del seed, así que la base de la app debe estar sembrada.

## Comandos

| Comando              | Descripción                                        |
| -------------------- | -------------------------------------------------- |
| `pnpm dev`           | Servidor de desarrollo                             |
| `pnpm build`         | Build de producción                                |
| `pnpm start`         | Servir el build de producción                      |
| `pnpm lint`          | ESLint                                             |
| `pnpm typecheck`     | `tsc --noEmit`                                     |
| `pnpm format`        | Prettier                                           |
| `pnpm db:generate`   | Generar migración a partir de los modelos Drizzle  |
| `pnpm db:migrate`    | Aplicar migraciones (`--test` para la base de test) |
| `pnpm db:seed`       | Sembrar módulos, permisos, menú y empresa inicial  |
| `pnpm sales:expire`  | Expirar ventas vencidas (programar diario por cron) |

## Documentación

- `docs/estructura.md`, `docs/modulos.md`, `docs/guia.md`: dominio y arquitectura.
- `docs/reporte-*.md`: reportes.
- `docs/mapa-laravel-nextjs.md`: equivalencias con el proyecto Laravel original.
- `CLAUDE.md`: convenciones del proyecto.
