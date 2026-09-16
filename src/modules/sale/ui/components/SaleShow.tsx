import { CalendarClock, DollarSign, Hash, Layers, Receipt, RefreshCw, ShoppingCart, StickyNote, Timer, Tv, User } from 'lucide-react';
import { BackLink } from '@/components/back-link';
import { MiniStat } from '@/components/mini-stat';
import { StatusPill } from '@/components/status-pill';
import { Card } from '@/components/ui/card';
import { money, formatDate } from '@/lib/format';
import { saleRoutes } from '@/modules/sale/routes';
import {
  SALE_CAPACITY_LABELS,
  SALE_PROFILE_STATUS_LABELS,
  SALE_STATUS_LABELS,
  saleStatusPill,
} from '@/modules/sale/ui/sale-labels';
import { TRANSACTION_CATEGORY_LABELS } from '@/modules/transaction/models/transaction.model';
import type { SaleAvailableProfileDto, SaleDetailDto } from '@/modules/sale/serializers/sale.serializer';
import { SaleShowActions } from './SaleShowActions';

type Props = {
  companyId: string;
  sale: SaleDetailDto;
  replacementProfiles: SaleAvailableProfileDto[];
  canRenew: boolean;
  canReactivate: boolean;
  canCancel: boolean;
  canApprove: boolean;
};

/** Ver: hero, contextual actions, metrics, occupied profiles, renewals and ledger entries. Server component. */
export function SaleShow({ companyId, sale, replacementProfiles, canRenew, canReactivate, canCancel, canApprove }: Props) {
  const occupiesProfiles = sale.status !== 'pending' && sale.status !== 'rejected';
  const remaining =
    sale.daysUntilExpiration >= 0
      ? `${sale.daysUntilExpiration} días`
      : `${Math.abs(sale.daysUntilExpiration)} días vencida`;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 p-6 pb-14">
      <BackLink href={saleRoutes.index(companyId)}>Ventas</BackLink>

      <Card className="flex-row flex-wrap items-center justify-between gap-5 rounded-2xl p-5">
        <div className="flex items-center gap-[18px]">
          <span className="bg-muted text-muted-foreground grid size-16 shrink-0 place-items-center rounded-[16px] border">
            <ShoppingCart className="size-7" />
          </span>
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-extrabold tracking-tight">{sale.client?.name ?? '—'}</h1>
              <StatusPill kind={saleStatusPill(sale.status)}>{SALE_STATUS_LABELS[sale.status]}</StatusPill>
              {sale.isInGracePeriod && <StatusPill kind="pendiente">En gracia</StatusPill>}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              <HeroMeta icon={Hash}>{sale.code}</HeroMeta>
              <HeroMeta icon={Tv}>{sale.service?.name ?? '—'}</HeroMeta>
              <HeroMeta icon={Layers}>
                {SALE_CAPACITY_LABELS[sale.capacity]} · {sale.plan?.name ?? '—'}
              </HeroMeta>
              <HeroMeta icon={User}>{sale.agent?.name ?? '—'}</HeroMeta>
            </div>
          </div>
        </div>

        <SaleShowActions
          companyId={companyId}
          sale={sale}
          replacementProfiles={replacementProfiles}
          canRenew={canRenew}
          canReactivate={canReactivate}
          canCancel={canCancel}
          canApprove={canApprove}
        />
      </Card>

      {sale.status === 'pending' && (
        <Card className="border-warn/40 bg-warn-soft text-warn rounded-2xl p-4 text-sm">
          Esta venta está por aprobar. Al verificar el pago y aprobarla se ocuparán los perfiles y se registrará el
          ingreso.
        </Card>
      )}

      {sale.canBeReactivated && sale.status === 'expired' && (
        <Card className="border-bad/40 bg-bad-soft text-bad rounded-2xl p-4 text-sm">
          Esta venta venció fuera del periodo de gracia. Al reactivarla se generará un nuevo ciclo; si los perfiles
          originales ya están ocupados deberás elegir otros.
        </Card>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <MiniStat label="Precio" value={money(sale.price)} icon={DollarSign} sub={`${sale.durationDays} días`} />
        <MiniStat label="Inicio" value={formatDate(sale.startDate)} icon={CalendarClock} />
        <MiniStat label="Vencimiento" value={formatDate(sale.endDate)} icon={CalendarClock} />
        <MiniStat
          label="Restante"
          value={remaining}
          icon={Timer}
          accent={sale.daysUntilExpiration < 0 && sale.canBeCancelled ? 'bad' : 'default'}
        />
      </div>

      <Card className="gap-0 overflow-hidden rounded-2xl py-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5">
          <div className="inline-flex items-center gap-2 text-base font-bold tracking-tight">
            <Layers className="text-muted-foreground size-4" />
            {occupiesProfiles ? 'Perfiles ocupados' : 'Perfiles asignados'}
          </div>
          <span className="text-muted-foreground text-[12.5px] font-semibold">
            {sale.saleProfiles.length} perfil{sale.saleProfiles.length !== 1 ? 'es' : ''}
          </span>
        </div>
        <div className="bg-muted text-muted-foreground hidden h-11 items-center gap-3 border-b px-5 text-[11.5px] font-bold tracking-wider uppercase lg:grid lg:grid-cols-[80px_1fr_2fr_1fr]">
          <div>Perfil</div>
          <div>Cuenta</div>
          <div>Correo</div>
          <div>Estado</div>
        </div>
        <div className="flex flex-col">
          {sale.saleProfiles.map((row) => (
            <div
              key={row.id}
              className="grid grid-cols-1 items-center gap-3 border-b px-5 py-3 last:border-b-0 lg:grid-cols-[80px_1fr_2fr_1fr]"
            >
              <div className="text-muted-foreground font-bold tabular-nums">#{row.number}</div>
              <div className="text-muted-foreground font-semibold tabular-nums">{row.account.code}</div>
              <div className="truncate font-semibold">{row.account.email}</div>
              <div className="text-muted-foreground text-[13.5px]">{SALE_PROFILE_STATUS_LABELS[row.profileStatus]}</div>
            </div>
          ))}
          {sale.saleProfiles.length === 0 && (
            <div className="text-muted-foreground p-8 text-center text-sm">Esta venta no tiene perfiles asignados.</div>
          )}
        </div>
      </Card>

      <Card className="gap-0 overflow-hidden rounded-2xl py-0">
        <div className="flex items-center gap-2 border-b p-5 text-base font-bold tracking-tight">
          <RefreshCw className="text-muted-foreground size-4" />
          Historial de renovaciones
        </div>
        <div className="flex flex-col">
          {sale.renewals.map((renewal) => (
            <div
              key={renewal.id}
              className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3 last:border-b-0"
            >
              <div className="flex flex-col">
                <span className="font-semibold">{formatDate(renewal.renewedAt)}</span>
                <span className="text-muted-foreground text-[12.5px]">
                  {formatDate(renewal.previousEndDate)} → {formatDate(renewal.newEndDate)} ({renewal.durationDays} días)
                </span>
              </div>
              <span className="font-bold tabular-nums">{money(renewal.price)}</span>
            </div>
          ))}
          {sale.renewals.length === 0 && (
            <div className="text-muted-foreground p-8 text-center text-sm">Sin renovaciones registradas.</div>
          )}
        </div>
      </Card>

      <Card className="gap-0 overflow-hidden rounded-2xl py-0">
        <div className="flex items-center gap-2 border-b p-5 text-base font-bold tracking-tight">
          <Receipt className="text-muted-foreground size-4" />
          Movimientos
        </div>
        <div className="flex flex-col">
          {sale.transactions.map((transaction) => (
            <div
              key={transaction.id}
              className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3 last:border-b-0"
            >
              <div className="flex flex-col">
                <span className="font-semibold">{transaction.description}</span>
                <span className="text-muted-foreground text-[12.5px]">
                  {formatDate(transaction.date)} · {TRANSACTION_CATEGORY_LABELS[transaction.category]}
                </span>
              </div>
              <span className={`font-bold tabular-nums ${transaction.type === 'income' ? 'text-ok' : 'text-bad'}`}>
                {transaction.type === 'income' ? '+' : '−'}
                {money(transaction.amount)}
              </span>
            </div>
          ))}
          {sale.transactions.length === 0 && (
            <div className="text-muted-foreground p-8 text-center text-sm">
              {sale.status === 'pending'
                ? 'Sin movimientos. El ingreso se registra al aprobar la venta.'
                : 'Sin movimientos registrados.'}
            </div>
          )}
        </div>
      </Card>

      {sale.notes && (
        <Card className="gap-2 rounded-2xl p-5">
          <div className="inline-flex items-center gap-2 text-base font-bold tracking-tight">
            <StickyNote className="text-muted-foreground size-4" />
            Notas
          </div>
          <p className="text-muted-foreground text-[13.5px] whitespace-pre-line">{sale.notes}</p>
        </Card>
      )}

      {sale.status === 'rejected' && sale.rejectionReason && (
        <Card className="gap-2 rounded-2xl p-5">
          <div className="text-base font-bold tracking-tight">Motivo de rechazo</div>
          <p className="text-muted-foreground text-[13.5px]">{sale.rejectionReason}</p>
        </Card>
      )}

      {sale.status === 'cancelled' && sale.cancellationReason && (
        <Card className="gap-2 rounded-2xl p-5">
          <div className="text-base font-bold tracking-tight">Motivo de expulsión</div>
          <p className="text-muted-foreground text-[13.5px]">{sale.cancellationReason}</p>
        </Card>
      )}
    </div>
  );
}

function HeroMeta({ icon: Icon, children }: { icon: typeof Hash; children: React.ReactNode }) {
  return (
    <span className="text-muted-foreground inline-flex items-center gap-1.5 text-[13.5px] font-medium">
      <Icon className="size-3.5 opacity-80" />
      {children}
    </span>
  );
}
