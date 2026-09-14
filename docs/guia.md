Crea el Módulo 6 (Sales) del CRM. Es el módulo central que conecta
Customer + Plan + Profile y maneja todo el ciclo de vida comercial:
crear venta, renovar, reactivar, expulsar (cancel), expirar
automáticamente.

Depende de los módulos previos ya implementados:
- services, plans (módulo 4)
- accounts, profiles (módulo 5)
- customers (módulo 3)
- transactions (módulo polimórfico)

Tres tablas nuevas: sales (cabecera), sale_profiles (perfiles ocupados),
sale_renewals (historial de renovaciones).

Tabla `sales`:
- id UUID PK
- company_id UUID
- code
- client_id UUID FK → customers.id ON DELETE RESTRICT
- plan_id UUID FK → plans.id ON DELETE RESTRICT
- agent_id UUID FK → users.id ON DELETE RESTRICT (quien hizo la venta)
- service_id UUID FK → services.id ON DELETE RESTRICT (denormalizado para queries)
- capacity varchar(20) not null CHECK IN ('profile','full_account')
- duration_days int not null CHECK >= 1
- price decimal(10,2) not null CHECK >= 0
- start_date date not null
- end_date date not null
- status varchar(20) not null CHECK IN ('active','expired','cancelled') default 'active'
- cancelled_at timestamptz nullable
- cancellation_reason varchar(255) nullable
- notes text nullable
- timestamps timestamptz
- soft deletes

Tabla `sale_profiles` (pivote):
- id UUID PK
- sale_id UUID FK → sales.id ON DELETE CASCADE
- profile_id UUID FK → profiles.id ON DELETE RESTRICT
- created_at timestamptz
- UNIQUE (sale_id, profile_id)

Tabla `sale_renewals`:
- id UUID PK
- sale_id UUID FK → sales.id ON DELETE RESTRICT
- renewed_at date not null
- previous_end_date date not null
- new_end_date date not null
- duration_days int not null CHECK >= 1
- price decimal(10,2) not null CHECK >= 0
- renewed_by UUID FK → users.id ON DELETE SET NULL
- notes text nullable
- created_at timestamptz

Índices:
- idx_sales_status_end_date (status, end_date)
- idx_sales_customer (customer_id)
- idx_sales_agent (agent_id)
- idx_sales_service (service_id)
- idx_sale_profiles_profile (profile_id)
- idx_sale_renewals_sale (sale_id)


Reglas de negocio CRÍTICAS:

1. SNAPSHOT del plan al crear venta: al crear una sale, copiar del plan
   los campos capacity, duration_days y price al registro de sale. La
   venta NO debe leer estos valores del plan en runtime — vive con su
   propio snapshot. Si el plan cambia después, las ventas existentes no
   se afectan.

2. Cálculo automático de end_date: end_date = start_date + duration_days.
   Calcularlo en el `SaleCreateService`, no permitir que el cliente lo
   envíe.

3. Coherencia de servicio: todos los profiles asignados a la venta DEBEN
   pertenecer a accounts cuyo service_id coincida con el service_id
   del plan seleccionado. La forma del input (lista de UUIDs) se valida
   en el schema Zod; la regla de negocio se verifica en el
   `SaleCreateService` dentro de la transacción, consultando los
   profiles con `SELECT ... FOR UPDATE`.

4. Disponibilidad: todos los profiles asignados DEBEN estar en estado
   'available' al momento de crear la venta. La forma se valida en el
   schema Zod; la regla de negocio se verifica en el `SaleCreateService`
   dentro de la transacción, usando `SELECT ... FOR UPDATE` sobre los
   profiles para evitar race conditions.

5. Capacidad coherente:
    - Si capacity='profile' → exactamente 1 profile en sale_profiles.
    - Si capacity='full_account' → exactamente N profiles, todos de la
      MISMA account, donde N = service.max_profiles_per_account.
      La cantidad mínima de ids se valida en el schema Zod; la
      pertenencia a la misma account y el valor exacto de N se verifican
      en el `SaleCreateService` dentro de la transacción, sobre los
      profiles ya bloqueados con `SELECT ... FOR UPDATE`.

6. Customer activo: solo permitir vender a customers con status='active'.

7. Transacción atómica al crear venta — en una sola transacción DB:
   a) INSERT en sales (con snapshot del plan)
   b) INSERT en sale_profiles (1 o N filas)
   c) UPDATE profiles SET status='occupied' para cada profile
   d) INSERT en transactions con type='income', category='sale',
   related_type='Sale', related_id=sale.id, amount=sale.price,
   date=sale.start_date, description='Venta {service} a {customer}'
   Si cualquiera de estos pasos falla, rollback completo.

8. RENOVAR — endpoint dedicado. Solo permitido si:
    - status='active', O
    - status='expired' y end_date >= (hoy - 3 días) [3 días de gracia]
      En una sola transacción:
      a) INSERT en sale_renewals con previous_end_date=sales.end_date y
      new_end_date=sales.end_date + duration_days (donde duration_days y
      price vienen del body o del plan original — decisión del agente)
      b) UPDATE sales SET end_date=new_end_date, status='active'
      c) INSERT en transactions con type='income', category='renewal',
      related_type='Sale', related_id=sale.id, amount=renewal.price
      Los profiles ya están 'occupied' por esta sale, no hay cambio en
      profiles.status.

9. REACTIVAR — caso especial de renovación cuando status='cancelled' o
   cuando ya pasaron los 3 días de gracia. Lógica:
    - Si los profiles originales siguen 'available', se reasignan a esta
      sale (mismas filas en sale_profiles).
    - Si alguno está 'occupied' por otra venta, la acción
      `reactivateSaleAction` devuelve
      `{ status: 'conflict', unavailableProfiles: [...] }` con la lista
      de profiles no disponibles y el frontend exige al agente elegir
      otros profiles disponibles del mismo service.
    - El resto del flujo es como una renovación normal: registro en
      sale_renewals, sales.status='active', nuevo end_date, transaction
      de tipo 'renewal' (o usar una category nueva 'reactivation' si
      prefieres separarlas en reportes — recomiendo 'renewal' para
      simplicidad).

10. EXPULSAR (cancel) — endpoint dedicado. En una sola transacción:
    a) UPDATE sales SET status='cancelled', cancelled_at=NOW(),
    cancellation_reason=...
    b) UPDATE profiles SET status='available' para cada profile en
    sale_profiles.
    c) NO se crea transaction negativa automática. Si hay reembolso, el
    supervisor lo registra manualmente desde el módulo de transactions.

11. EXPIRAR automáticamente — job programado diario
    (`src/scripts/sales-expire.ts`, ejecutado con `pnpm sales:expire`
    por cron cada noche a las 00:30, que invoca `SalesExpireService`):
    a) Marca como status='expired' todas las sales donde end_date < hoy
    y status='active'.
    b) NO libera los profiles todavía (periodo de gracia).
    c) Un segundo paso del mismo job: para sales con status='expired' y
    end_date < (hoy - 3 días), liberar los profiles (UPDATE profiles
    SET status='available' para los de su sale_profiles).
    Ambos pasos en transacciones independientes por sale (no una sola
    transacción gigante).

12. Borrado: usar soft delete. NO permitir borrado físico desde la
    aplicación; ver skill `no-delete-policy`.

Implementación Next.js:

- Modelo Drizzle `sales` en `src/modules/sale/models/sale.model.ts`
  (`pgTable('app_sales')`) con `relations()`:
  · `client` (one → customers), `plan` (one → plans), `service`
    (one → services)
  · `agent` (one → users)
  · `saleProfiles` (many → `saleProfiles`), y a través de ellos los
    `profiles`
  · `renewals` (many → `saleRenewals`)
  · `transactions`: relación polimórfica resuelta por
    `relatedType='Sale'` + `relatedId=sale.id` (cuando exista el módulo
    de transactions, ya documentado allí: añadir aquí el join/consulta
    por `relatedType`/`relatedId`).
- Modelo `saleProfiles` (`pgTable('app_sale_profiles')`): tabla pivote
  con id propio generado en servidor con `$defaultFn(uuidv7)`, no usar
  pivote anónimo.
- Modelo `saleRenewals` (`pgTable('app_sale_renewals')`) con relaciones
  `sale` y `renewedBy` (users).
- Columna `deletedAt` (timestamptz nullable) en `sales` para soft delete;
  el repositorio filtra `isNull(sales.deletedAt)` por defecto.
- Filtros en `src/modules/sale/repositories/sale.filters.ts`:
  · `active` / `expired` / `cancelled`
  · `expiringSoon` (días, default 7)   // end_date entre hoy y hoy+N,
    status active
  · `ofAgent` (userId)
  · `ofClient` (clientId)
  · `ofService` (serviceId)
- Funciones puras en `src/modules/sale/domain/sale-rules.ts` (reciben la
  fila de la venta, sin acceso a DB):
  · `isInGracePeriod(sale): boolean`
  · `canBeRenewed(sale): boolean`
  · `canBeReactivated(sale): boolean`
  · `daysUntilExpiration(sale): number`
- `SalesExpireService` (`src/modules/sale/services/sales-expire.service.ts`)
  invocado por el script `src/scripts/sales-expire.ts`, registrado como
  `pnpm sales:expire` y programado por cron.

Entregables: migraciones generadas con drizzle-kit (3 tablas), modelos
Drizzle, schemas Zod para Create/Renew/Reactivate/Cancel, acciones en
`src/app/[companyId]/sales/actions.ts` (`createSaleAction`,
`renewSaleAction`, `reactivateSaleAction`, `cancelSaleAction`,
`updateSaleStatusAction`), páginas bajo `src/app/[companyId]/sales/`
(listar, crear con wizard, ver), serializer
`src/modules/sale/serializers/sale.serializer.ts` (incluir `saleProfiles`
anidados con datos del profile y de la account para que el frontend
muestre todo en una sola carga), factories
`tests/factories/sale.factory.ts` y
`tests/factories/sale-renewal.factory.ts`, seed `src/db/seed/sales.ts`
con 15-20 ventas variadas (algunas active, algunas expired en gracia,
algunas cancelled, algunas con renewals), script
`src/scripts/sales-expire.ts`, tests Vitest de integración exhaustivos
para cada regla crítica y Playwright para el wizard de creación.

Casos de uso (páginas y acciones):
- Crear venta → `createSaleAction` (con snapshot del plan, asignación de
  profiles, creación de transaction).
- Renovar venta existente → `renewSaleAction`.
- Reactivar venta cancelada o fuera de gracia (con posible cambio de
  profiles) → `reactivateSaleAction`.
- Cancelar (expulsar) venta → `cancelSaleAction`.
- Listar ventas → página `sales/page.tsx` con filtros: status, client,
  agent, service, date_from, date_to, expiring_soon.
- Ver detalle de venta con sus profiles, renewals y transactions →
  página `sales/[id]/page.tsx`.
- Listar renovaciones de una venta específica → sección del detalle o
  página `sales/[id]/renewals/page.tsx`.

Configuración:
- Días de gracia configurables en `src/config/sales.ts` con default 3
  (variable de entorno `SALES_GRACE_PERIOD_DAYS`). Usar
  `salesConfig.gracePeriodDays` en todo el código.

Nota de UX para el frontend (documentar en `docs/`):
- El formulario de crear venta debe ser un wizard de 3 pasos:
  paso 1) seleccionar customer, paso 2) seleccionar plan (filtra
  automáticamente service), paso 3) seleccionar profile(s) disponibles
  del service correspondiente.
- El detalle de venta muestra: cabecera de la venta, tabla de profiles
  ocupados (con email de la account y número de profile), historial de
  renovaciones, transacciones asociadas.
- Botones de acción contextuales según status:
  · active: Renovar, Expulsar
  · expired (en gracia): Renovar, Expulsar
  · cancelled: Reactivar
  · expired (fuera de gracia): Reactivar (con advertencia)
