# Reporte por Servicio / Plan

## Objetivo

Mostrar el desempeño comercial agrupado por **servicio** y por **plan**: qué se
vende más, cuánto ingreso genera cada uno, el ticket promedio y el mix de
capacidad (`profile` vs `full_account`). Sirve para decidir qué inventario
priorizar y qué planes conviene impulsar o retirar.

## Valor para el negocio

- Identifica los servicios/planes más rentables y los de bajo rendimiento.
- Permite comparar precio de venta real vs `roi_target_pct` del plan.
- Ayuda a planificar compras de inventario según demanda.
- Revela el mix `profile` / `full_account` para ajustar la oferta.

## Fuente de datos

Modelo principal: `src/modules/sale/models/sale.model.ts` (tabla `app_sales`),
agrupado por `service_id` y/o `plan_id`.

Modelos de apoyo:
- `src/modules/service/models/service.model.ts` (`code`, `name`,
  `max_profiles`, `active`).
- `src/modules/plan/models/plan.model.ts` (`code`, `name`, `capacity`,
  `duration_days`, `sale_price`, `roi_target_pct`, `service_id`, `active`).

Campos de `sales` usados en la agregación:

| Campo        | Uso                                                       |
|--------------|----------------------------------------------------------|
| `service_id` | Agrupación por servicio                                   |
| `plan_id`    | Agrupación por plan                                       |
| `capacity`   | Mix `profile` vs `full_account`                           |
| `price`      | Ingreso y ticket promedio                                 |
| `status`     | Filtrar/segmentar (`active`, `expired`, `cancelled`)     |
| `created_at` | Acotar al periodo del reporte                            |

Filtros ya disponibles en `src/modules/sale/repositories/sale.filters.ts`:
`ofService`, `active`, `expired`, `cancelled`.

## Filtros

- **Rango de fechas** (`date_from`, `date_to`) sobre `created_at` de la venta.
  Por defecto: inicio de mes → hoy (igual que el reporte de ingresos/gastos).
- **Agrupación** (`group_by`): `service` | `plan`. Por defecto `service`.
- **Servicio** (`service_id`) — opcional, para profundizar en un servicio.
- **Estado** (`status`) — opcional: incluir/excluir `cancelled`.
- **Capacidad** (`capacity`) — opcional: `profile` | `full_account`.
- Paginación: `limit` / `offset`.
- `searched` (boolean): no consulta hasta que el usuario filtra.

## Métricas / Resumen (cards)

Calculadas en `ServicePlanSummaryService`:

- `total_sales` — nº total de ventas en el periodo.
- `total_revenue` — `SUM(price)`.
- `avg_ticket` — `total_revenue / total_sales`.
- `top_service` / `top_plan` — el de mayor ingreso.
- Desglose de mix capacidad: `profile_count`, `full_account_count`.

## Salida (tabla agrupada)

Una fila por servicio (o por plan, según `group_by`):

`code` · `nombre` · `nº ventas` · `ingreso total` · `ticket promedio` ·
`% del ingreso total` · (si `group_by=plan`) `sale_price` y `roi_target_pct`
del plan para comparar contra el ingreso real.

Ordenar por ingreso total descendente. Fila de **totales** al pie.

> Considerar gráfico de barras (ingreso por servicio) y dona (mix de capacidad)
> reutilizando el patrón visual del Dashboard.

## Implementación sugerida (arquitectura modular)

Módulo: `src/modules/report` (reutilizar el existente).

```
src/modules/report/
├── services/
│   └── service-plan-summary.service.ts   # agregaciones por service/plan
├── permissions.ts                        # añadir reports.service_plan
├── routes.ts                             # añadir reportRoutes.servicePlan
└── ui/
    └── service-plan/                     # filtros, cards, tabla, gráficos

src/app/[companyId]/reports/service-plan/
└── page.tsx                              # Server Component: guardPage + consulta + render
```

La agregación conviene resolverla con Drizzle, respetando siempre el
`companyId`:

```ts
db
  .select({
    serviceId: sales.serviceId,
    count: count(),
    revenue: sum(sales.price),
  })
  .from(sales)
  .where(and(eq(sales.companyId, companyId), ...filtros))
  .groupBy(sales.serviceId);
```

Encapsular esa query en un método del repositorio del módulo `Sale`
(preferido, mantiene la query junto a su modelo) o en el service del módulo
Report.

### Página (patrón a seguir)

Calcada de la página del reporte de ingresos/gastos
(`src/app/[companyId]/reports/income-expenses/page.tsx`):

```ts
await guardPage(companyId, 'reports.service_plan');
```

- Lee filtros desde `searchParams` con defaults (`group_by = 'service'`, mes
  actual).
- Sólo ejecuta la consulta si `searched === 'true'`.
- Pasa `data`, `summary`, `meta` y `filters` como props al componente de UI.

### Página

La página vive en `src/app/[companyId]/reports/service-plan/page.tsx` y
responde en `/{companyId}/reports/service-plan`. Los enlaces se construyen con
`reportRoutes.servicePlan(companyId)` (`src/modules/report/routes.ts`), nunca
con URLs escritas a mano.

### Permiso

Registrar `reports.service_plan` (texto UI: "Ver reporte por servicio/plan"):

- `src/modules/report/permissions.ts` (módulo reports, siguiente `order`).
- `src/modules/shared/menu/menu-registry.ts` (entrada de menú con ese
  `permission`).
- Ejecutar `pnpm db:seed` para sembrar permiso y menú.

> Ver memoria *Permisos/menús de un módulo*: el registro es vía registries
> (`permissions.ts` + `menu-registry.ts`) + seed, no migraciones.

### Frontend

`src/modules/report/ui/service-plan/` siguiendo la UI del reporte de
ingresos/gastos (`src/modules/report/ui/income-expenses/`): filtros (incl.
toggle servicio/plan), cards de resumen, tabla agrupada y, opcionalmente,
gráficos. Enlaces vía `reportRoutes`. Estado vacío con skeleton mientras no se
ha buscado.

## Tests (obligatorio)

`tests/integration/report/service-plan-report.test.ts` (Vitest):

- Redirige/deniega sin el permiso `reports.service_plan`.
- No consulta hasta `searched=true`.
- Agrupa correctamente por servicio (`group_by=service`).
- Agrupa correctamente por plan (`group_by=plan`).
- `total_revenue` y `avg_ticket` se calculan bien.
- Filtra por rango de fechas y por `capacity`.
- Respeta el aislamiento por compañía (`company_id`).

Usar factories `tests/factories/sale.factory.ts`,
`tests/factories/service.factory.ts` y `tests/factories/plan.factory.ts`.
