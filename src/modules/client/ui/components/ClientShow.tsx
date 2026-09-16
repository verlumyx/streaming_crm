import Link from 'next/link';
import { Clock, Edit, Mail, Phone, Plus, StickyNote, Tv } from 'lucide-react';
import { BackLink } from '@/components/back-link';
import { InitialsAvatar } from '@/components/initials-avatar';
import { MiniStat } from '@/components/mini-stat';
import { StatusPill } from '@/components/status-pill';
import { WhatsAppAction, WhatsAppButton } from '@/components/whatsapp-button';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { money } from '@/lib/format';
import { fmtFecha, mesesDesde } from '@/lib/dates';
import { clientRoutes } from '@/modules/client/routes';
import { saleRoutes } from '@/modules/sale/routes';
import { SALE_CAPACITY_LABELS, SALE_STATUS_LABELS, saleStatusPill } from '@/modules/sale/ui/sale-labels';
import type { ClientDto, ClientMetricsDto, ClientSaleDto } from '@/modules/client/serializers/client.serializer';
import { ClientStatusButton } from './ClientStatusButton';

type Props = {
  companyId: string;
  client: ClientDto;
  sales: ClientSaleDto[];
  metrics: ClientMetricsDto;
  canUpdate: boolean;
  canUpdateStatus: boolean;
  canCreateSale: boolean;
};

const PRIMARY_SHADOW = 'shadow-[0_4px_12px_color-mix(in_srgb,var(--primary)_28%,transparent)]';

/** Ver: hero, metrics and the client's active/expired sales. Server component. */
export function ClientShow({ companyId, client, sales, metrics, canUpdate, canUpdateStatus, canCreateSale }: Props) {
  const tel = client.phone ?? '';
  const months = mesesDesde(client.createdAt);
  const activeCount = sales.filter((s) => s.status === 'active').length;
  const canSell = canCreateSale && client.status === 'active';

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 p-6 pb-14">
      <BackLink href={clientRoutes.index(companyId)}>Clientes</BackLink>

      <Card className="flex-row flex-wrap items-center justify-between gap-5 rounded-2xl p-5">
        <div className="flex items-center gap-[18px]">
          <InitialsAvatar name={client.name} size={64} />
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-extrabold tracking-tight">{client.name}</h1>
              <StatusPill kind={client.status === 'inactive' ? 'inactivo' : 'activo'} />
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              {tel && (
                <span className="text-muted-foreground inline-flex items-center gap-1.5 text-[13.5px] font-medium">
                  <Phone className="size-3.5 opacity-80" />
                  {tel}
                </span>
              )}
              {client.email && (
                <span className="text-muted-foreground inline-flex items-center gap-1.5 text-[13.5px] font-medium">
                  <Mail className="size-3.5 opacity-80" />
                  {client.email}
                </span>
              )}
              <span className="text-muted-foreground inline-flex items-center gap-1.5 text-[13.5px] font-medium">
                <Clock className="size-3.5 opacity-80" />
                Cliente hace {months} mes{months !== 1 ? 'es' : ''}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {tel && <WhatsAppAction tel={tel} />}
          {canUpdateStatus && <ClientStatusButton companyId={companyId} clientId={client.id} status={client.status} />}
          {canUpdate && (
            <Button asChild variant="outline" className="bg-card h-10 rounded-[11px] px-4 font-semibold">
              <Link href={clientRoutes.edit(companyId, client.id)}>
                <Edit />
                Editar
              </Link>
            </Button>
          )}
          {canSell ? (
            <Button asChild className={`h-10 rounded-[11px] px-4 font-semibold ${PRIMARY_SHADOW}`}>
              <Link href={saleRoutes.create(companyId, { client: client.id })}>
                <Plus />
                Vender perfil
              </Link>
            </Button>
          ) : (
            <Button
              className={`h-10 rounded-[11px] px-4 font-semibold ${PRIMARY_SHADOW}`}
              disabled
              title={
                client.status === 'active'
                  ? 'No tienes permiso para crear ventas'
                  : 'El cliente debe estar activo para venderle'
              }
            >
              <Plus />
              Vender perfil
            </Button>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <MiniStat label="Ingreso mensual" value={money(metrics.monthlyIncome)} />
        <MiniStat label="Perfiles activos" value={activeCount} />
        <MiniStat
          label="Deuda pendiente"
          value={money(metrics.pendingDebt)}
          accent={metrics.pendingDebt > 0 ? 'bad' : 'default'}
        />
        <MiniStat label="Total pagado (histórico)" value={money(metrics.totalPaid)} />
      </div>

      <div className="flex min-w-0 flex-col gap-5">
        <div className="flex items-center gap-2 text-[15px] font-bold">
          Perfiles activos
          <span className="bg-muted text-muted-foreground rounded-full border px-2 py-px text-xs font-bold">
            {sales.length}
          </span>
        </div>

        {sales.length ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {sales.map((sale) => {
              const profileLabel =
                sale.capacity === 'full_account'
                  ? SALE_CAPACITY_LABELS.full_account
                  : sale.profileNumbers.length
                    ? sale.profileNumbers.map((n) => `#${n}`).join(', ')
                    : '—';
              return (
                <Card key={sale.id} className="border-t-primary/60 gap-3.5 rounded-2xl border-t-[3px] p-4">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-2 text-[13.5px] font-bold">
                      <Tv className="text-muted-foreground size-4" />
                      {sale.serviceName}
                    </span>
                    <StatusPill kind={saleStatusPill(sale.status)}>{SALE_STATUS_LABELS[sale.status]}</StatusPill>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Row label="Perfil">{profileLabel}</Row>
                    <Row label="Cuenta">
                      <span className="max-w-[165px] truncate font-mono text-[11.5px]">{sale.accountEmail ?? '—'}</span>
                    </Row>
                    <Row label="Precio">{money(sale.price)}</Row>
                    <Row label="Vence">{fmtFecha(new Date(`${sale.endDate}T00:00:00`))}</Row>
                  </div>
                  <div className="mt-0.5 flex gap-2">
                    <Button asChild variant="secondary" size="sm" className="h-[33px] flex-1 rounded-[9px] font-semibold">
                      <Link href={saleRoutes.show(companyId, sale.id)}>Ver venta</Link>
                    </Button>
                    {tel && <WhatsAppButton tel={tel} label="Avisar" size="sm" />}
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="text-muted-foreground rounded-2xl p-8 text-center text-sm">
            Este cliente no tiene perfiles activos.
          </Card>
        )}

        {client.notes && (
          <Card className="gap-2 rounded-2xl px-[18px] py-4">
            <div className="text-muted-foreground flex items-center gap-2 text-[13px] font-bold">
              <StickyNote className="size-[15px]" />
              Nota
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{client.notes}</p>
          </Card>
        )}
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2.5 text-[13px]">
      <span className="text-muted-foreground font-medium">{label}</span>
      <b className="font-bold whitespace-nowrap">{children}</b>
    </div>
  );
}
