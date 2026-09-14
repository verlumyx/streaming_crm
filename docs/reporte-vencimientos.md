# Reporte de Vencimientos y Renovaciones

## Objetivo

Listar las ventas próximas a vencer y las ya vencidas sin renovar, para que el
equipo pueda contactar al cliente **antes** de perderlo. Es el reporte más
accionable del negocio de suscripciones: convierte el `end_date` de cada venta
en una acción comercial concreta (renovar).

## Valor para el negocio

- Reduce la fuga de clientes anticipando los vencimientos.
- Conecta con la definición de **"Por cobrar"** del Dashboard (ventas `expired`).
- Reutiliza el flujo de renovación ya existente
  (`src/modules/sale/ui/components/SaleRenewDialog.tsx` + `renewSaleAction`),
  así que desde el reporte se puede renovar directamente.
- Permite medir la **tasa de renovación** (ventas renovadas / ventas vencidas).

## Fuente de datos

Modelo principal: `src/modules/sale/models/sale.model.ts` (tabla `app_sales`).

Campos relevantes:

| Campo            | Uso en el reporte                                   |
|------------------|-----------------------------------------------------|
| `end_date`       | Fecha de vencimiento (eje del reporte)              |
| `status`         | `active`, `expired`, `cancelled`                    |
| `price`          | Monto a cobrar en la renovación                     |
| `client_id`      | Cliente a contactar                                 |
| `service_id`     | Servicio vendido                                    |
| `plan_id`        | Plan vendido                                        |
| `agent_id`       | Vendedor responsable del seguimiento               |
| `cancelled_at`   | Para excluir/visualizar canceladas                  |

Relaciones a cargar (joins en el repositorio o `relations()` del modelo, en
una sola consulta para evitar N+1): `client`, `service`, `plan`, `agent`,
`renewals`.

Filtros ya disponibles en `src/modules/sale/repositories/sale.filters.ts`:

- `active`
- `expired`
- `expiringSoon` (días, default 7) — activas que vencen entre hoy y hoy+N
  días.
- `ofAgent`, `ofService`, `ofClient`

Funciones puras útiles en `src/modules/sale/domain/sale-rules.ts`:
`isInGracePeriod(sale)` y `canBeRenewed(sale)` (usan
`salesConfig.gracePeriodDays` de `src/config/sales.ts`).

## Filtros

- **Rango de días por vencer** (`days`): próximos 7 / 15 / 30 días. Por defecto 7.
- **Rango de fechas explícito** (`date_from`, `date_to`) sobre `end_date`
  (opcional, alternativo al rango de días).
- **Estado** (`status`): `expiring` (activas por vencer) | `expired` (vencidas
  sin renovar) | `all`.
- **Servicio** (`service_id`) — opcional.
- **Agente** (`agent_id`) — opcional.
- Paginación: `limit` / `offset` (mismo patrón que el reporte de ingresos).
- `searched` (boolean): el reporte no consulta hasta que el usuario filtra,
  igual que la página del reporte de ingresos/gastos.

## Métricas / Resumen (cards)

Calculadas en un service dedicado tipo `ExpirationSummaryService`:

- `expiring_count` — nº de ventas por vencer en el rango.
- `expiring_amount` — `SUM(price)` de las ventas por vencer.
- `expired_count` — nº de ventas vencidas sin renovar.
- `expired_amount` — `SUM(price)` de las vencidas (= base de "Por cobrar").
- `renewal_rate` — % de ventas vencidas en el periodo que sí fueron renovadas
  (cruzando con `app_sale_renewals`).

## Salida (tabla)

Una fila por venta, ordenada por `end_date` ascendente (las más urgentes
arriba):

`code` · `client` · `service` / `plan` · `price` · `end_date` ·
`días restantes` (negativo si ya venció) · `status` · `agent` ·
acción **Renovar** (abre `SaleRenewDialog`).

Resaltar visualmente:
- Rojo: ya vencidas (`expired`).
- Ámbar: vencen en ≤ 3 días.
- En periodo de gracia: badge (usa `isInGracePeriod()`).

## Implementación sugerida (arquitectura modular)

Módulo: `src/modules/report` (reutilizar el existente).

```
src/modules/report/
├── services/
│   └── expiration-summary.service.ts     # totales y renewal_rate
├── serializers/
│   └── expiration.serializer.ts          # ExpirationDto (solo si no basta toSaleDto)
├── permissions.ts                        # añadir reports.expirations
├── routes.ts                             # añadir reportRoutes.expirations
└── ui/
    └── expirations/                      # filtros, cards, tabla

src/app/[companyId]/reports/expirations/
└── page.tsx                              # Server Component: guardPage + consulta + render
```

Para la consulta paginada del listado se puede:
- Añadir un `SearchService` / método de repositorio en el módulo `Sale`
  (preferido, mantiene la query junto a su modelo), o
- Resolver vía los filtros existentes de `sale.filters.ts` desde un service del
  módulo Report.

### Página (patrón a seguir)

Calcada de la página del reporte de ingresos/gastos
(`src/app/[companyId]/reports/income-expenses/page.tsx`):

```ts
await guardPage(companyId, 'reports.expirations');
```

- Lee filtros desde `searchParams` con valores por defecto (`days = 7`,
  `status = 'expiring'`).
- Sólo ejecuta la búsqueda si `searched === 'true'`.
- Pasa `data` (DTOs vía serializer), `summary`, `meta` y `filters` como props
  al componente de UI.

### Serializer

Reutilizar `toSaleDto` (`src/modules/sale/serializers/sale.serializer.ts`) si
ya expone los campos necesarios; si falta `días restantes`/`isInGracePeriod`,
crear un `ExpirationDto` específico en el módulo Report
(`src/modules/report/serializers/expiration.serializer.ts`), calculando esos
campos con las funciones puras de `sale-rules.ts`.

### Página

La página vive en `src/app/[companyId]/reports/expirations/page.tsx` y
responde en `/{companyId}/reports/expirations`. Los enlaces se construyen con
`reportRoutes.expirations(companyId)` (`src/modules/report/routes.ts`), nunca
con URLs escritas a mano.

### Permiso

Registrar `reports.expirations` (texto UI: "Ver reporte de vencimientos"):

- `src/modules/report/permissions.ts` (módulo reports, siguiente `order`).
- `src/modules/shared/menu/menu-registry.ts` (entrada de menú con ese
  `permission`).
- Ejecutar `pnpm db:seed` para sembrar permiso y menú.

> Ver memoria *Permisos/menús de un módulo*: el registro es vía registries
> (`permissions.ts` + `menu-registry.ts`) + seed, no migraciones.

### Frontend

`src/modules/report/ui/expirations/` siguiendo la UI del reporte de
ingresos/gastos (`src/modules/report/ui/income-expenses/`): filtros arriba,
cards de resumen, tabla. Usar `reportRoutes` / `saleRoutes` para enlaces y el
`SaleRenewDialog` existente (`src/modules/sale/ui/components/SaleRenewDialog.tsx`)
para la acción de renovar. Estado vacío con skeleton mientras no se ha buscado.

## Tests (obligatorio)

`tests/integration/report/expiration-report.test.ts` (Vitest):

- Redirige/deniega sin el permiso `reports.expirations`.
- No consulta hasta `searched=true` (resumen en cero, data vacía).
- Filtra correctamente por rango de días (`expiringSoon`).
- Lista vencidas sin renovar cuando `status=expired`.
- `renewal_rate` se calcula bien cruzando con `app_sale_renewals`.
- Respeta el aislamiento por compañía (`company_id`).

Usar factories `tests/factories/sale.factory.ts` y
`tests/factories/sale-renewal.factory.ts`.
