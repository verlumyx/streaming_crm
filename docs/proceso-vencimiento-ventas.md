# Proceso de Vencimiento Diario de Ventas

## Objetivo

Mantener al día el estado de las ventas y de los perfiles sin intervención
manual: marcar como vencidas las ventas cuyo periodo terminó y, tras un periodo
de gracia, liberar los perfiles que ocupaban para que se puedan volver a vender.

Es el único proceso en segundo plano del sistema. No modifica el estado de las
**cuentas** (`app_accounts.status`) ni pasa perfiles a `maintenance`; esos
cambios siguen siendo manuales.

## Piezas

| Pieza                  | Ubicación                                                    |
|------------------------|--------------------------------------------------------------|
| Script (entry point)   | `src/scripts/sales-expire.ts`                                |
| Comando                | `pnpm sales:expire` (`tsx src/scripts/sales-expire.ts`)      |
| Servicio               | `src/modules/sale/services/sales-expire.service.ts`          |
| Cableado               | `createSaleContainer(db).expireService` (`src/modules/sale/container.ts`) |
| Consultas              | `src/modules/sale/repositories/drizzle-sale.repository.ts` (`findDueActiveSaleIds`, `markExpired`, `findExpiredSaleIdsEndingBefore`, `releaseProfiles`) |
| Reglas de gracia       | `src/modules/sale/domain/sale-rules.ts` (`isInGracePeriod`, `canBeRenewed`, `canBeReactivated`) |
| Configuración          | `src/config/sales.ts` (`SALES_GRACE_PERIOD_DAYS`)            |
| Test                   | `tests/unit/modules/sale/sale-services.test.ts` (`describe('SalesExpireService')`) |

El script corre con `tsx`, **fuera de Next.js**: carga `.env` con
`dotenv/config` y después importa de forma diferida `@/db/client` (para que
`DATABASE_URL` ya esté definido). Procesa **todas las compañías** en una sola
ejecución.

## Configuración

| Variable                  | Default | Descripción                                             |
|---------------------------|---------|---------------------------------------------------------|
| `DATABASE_URL`            | —       | Conexión a PostgreSQL.                                  |
| `SALES_GRACE_PERIOD_DAYS` | `3`     | Días después de `end_date` en que una venta vencida conserva sus perfiles y aún se puede renovar. Valores no numéricos o negativos usan el default. |

La fecha de referencia (`today`) se calcula con `todayIsoDate()`, que usa la
**hora local del proceso**. El servidor (o la variable `TZ` del cron) debe
estar en la zona horaria del negocio; si no, el corte de día se desplaza.

## Flujo

`SalesExpireService.execute(today)` ejecuta dos pasos en orden. Cada venta se
procesa en **su propia transacción** (`runInTransaction`), nunca en una
transacción global: si una venta falla, las ya procesadas quedan confirmadas.

### Paso 1 — Expirar ventas vencidas

1. `findDueActiveSaleIds(today)` obtiene las ventas con
   `status = 'active'`, `end_date < today` y `deleted_at IS NULL`.
2. Por cada una, `markExpired(saleId, today)` hace
   `UPDATE app_sales SET status = 'expired'` repitiendo la condición
   (`status = 'active' AND end_date < today`) dentro de la transacción. Si la
   venta se renovó o canceló entre la consulta y la actualización, no se toca.
3. Los perfiles **siguen `occupied`**: la venta entra en periodo de gracia.

Una venta con `end_date = today` todavía no vence; vence en la ejecución del día
siguiente.

### Paso 2 — Liberar perfiles tras la gracia

1. `cutoff = today − SALES_GRACE_PERIOD_DAYS`.
2. `findExpiredSaleIdsEndingBefore(cutoff)` obtiene las ventas con
   `status = 'expired'`, `end_date < cutoff` y `deleted_at IS NULL`.
3. Por cada una, `releaseProfiles(saleId)` pasa a `available` los perfiles de
   su `app_sale_profiles` que cumplan **todas** estas condiciones:
   - están en `occupied`;
   - no los retiene otra venta: no existe otra venta no cancelada y no borrada
     que haya asignado ese mismo perfil **después** que esta
     (`heldByAnotherSale`).

La condición de `occupied` hace el paso idempotente: en ejecuciones
posteriores la misma venta vuelve a aparecer, pero ya no libera nada.

### Línea de tiempo (gracia = 3 días, `end_date` = 10)

| Día de ejecución | Estado de la venta | Perfiles    | Acción disponible |
|------------------|--------------------|-------------|-------------------|
| 10               | `active`           | `occupied`  | Renovar           |
| 11               | `expired`          | `occupied`  | Renovar (gracia)  |
| 12 – 13          | `expired`          | `occupied`  | Renovar (gracia)  |
| 14               | `expired`          | `available` | Reactivar         |

La interfaz aplica la misma regla por fecha (`isInGracePeriod`:
`end_date + gracia >= today`), así que desde el día 14 la venta ya no se puede
renovar, solo reactivar (y la reactivación vuelve a validar que los perfiles
estén libres).

## Resultado y códigos de salida

El servicio devuelve `{ expired, released }`:

- `expired`: ventas que pasaron a `expired` en el paso 1.
- `released`: ventas que liberaron **al menos un** perfil en el paso 2 (no el
  número de perfiles).

El script lo imprime en una línea:

```
[2026-09-16] Ventas expiradas: 4. Ventas con perfiles liberados: 2.
```

Termina con código `0` si todo fue bien. Ante cualquier error lo imprime por
`stderr` y termina con código `1`, sin procesar las ventas restantes (las ya
confirmadas no se revierten). Volver a ejecutarlo el mismo día es seguro.

## Programación

El repositorio **no incluye** la programación: no hay servicio en
`docker-compose.yml`, cron de plataforma ni `instrumentation.ts`. Debe
configurarse en el servidor. Ejemplo con crontab, todos los días a las 00:30:

```
30 0 * * * cd /ruta/streaming_crm && TZ=America/Caracas pnpm sales:expire >> /var/log/streaming_crm/sales-expire.log 2>&1
```

Ajustar la ruta, la zona horaria y el destino del log al entorno. Conviene
ejecutarlo poco después de medianoche para que el dashboard ("Por cobrar") y el
reporte de vencimientos (`docs/reporte-vencimientos.md`) muestren los estados
del día.

## Ejecución manual

```
pnpm sales:expire
```

Útil tras una caída del cron: como compara contra `today`, una sola ejecución
pone al día todas las ventas atrasadas, sin importar cuántos días se hayan
saltado.

## Tests

`tests/unit/modules/sale/sale-services.test.ts` cubre el servicio con un
repositorio en memoria: expira solo las ventas activas con `end_date < today`,
no toca las que vencen hoy, libera perfiles solo de las ventas vencidas fuera
de la gracia y usa una unidad de trabajo por venta.
