import Link from 'next/link';
import { ServiceBadge } from '@/components/service-badge';
import { StatusPill } from '@/components/status-pill';
import { Card } from '@/components/ui/card';
import { WhatsAppButton } from '@/components/whatsapp-button';
import { saleRoutes } from '@/modules/sale/routes';
import type { DashboardExpirationDto } from '@/modules/dashboard/serializers/dashboard.serializer';

function label(item: DashboardExpirationDto): string {
  if (item.statusKey === 'vencido') return `Venció hace ${Math.abs(item.days)}d`;
  if (item.days === 0) return 'Vence hoy';
  return `${item.days}d`;
}

/** Upcoming sale expirations with a WhatsApp reminder. */
export function DashboardExpirations({
  companyId,
  expirations,
}: {
  companyId: string;
  expirations: DashboardExpirationDto[];
}) {
  return (
    <Card className="gap-0 rounded-2xl py-0">
      <div className="flex items-start justify-between gap-3 p-5 pb-0">
        <div>
          <div className="text-base font-bold tracking-tight">Próximos vencimientos</div>
          <div className="text-muted-foreground mt-0.5 text-[13px]">Renueva o envía recordatorio</div>
        </div>
        <span className="bg-warn-soft text-warn rounded-full px-2.5 py-0.5 text-[13px] font-bold">
          {expirations.length}
        </span>
      </div>
      {expirations.length === 0 ? (
        <div className="text-muted-foreground p-5 pt-2.5 text-[13px]">No hay vencimientos próximos.</div>
      ) : (
        <div className="flex flex-col p-3 pt-2.5 pb-5">
          {expirations.map((item) => (
            <div key={item.id} className="hover:bg-muted flex items-center gap-3 rounded-xl p-2.5 transition-colors">
              <ServiceBadge name={item.serviceName} size={32} />
              <div className="flex min-w-0 flex-1 flex-col">
                <Link
                  href={saleRoutes.show(companyId, item.id)}
                  className="hover:text-primary w-fit text-left text-sm font-bold"
                >
                  {item.clientName}
                </Link>
                <span className="text-muted-foreground truncate text-xs">
                  {item.serviceName} · {item.code}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <StatusPill kind={item.statusKey}>{label(item)}</StatusPill>
                {item.clientPhone && (
                  <WhatsAppButton tel={item.clientPhone} label="Recordatorio por WhatsApp" size="sm" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
