import { CalendarDays, Hash, Users } from 'lucide-react';
import { BackLink } from '@/components/back-link';
import { MiniStat } from '@/components/mini-stat';
import { StatusPill } from '@/components/status-pill';
import { Card } from '@/components/ui/card';
import { formatDate } from '@/lib/format';
import { serviceRoutes } from '@/modules/service/routes';
import type { ServiceDto } from '@/modules/service/serializers/service.serializer';
import { ServiceLogo } from './ServiceLogo';

type Props = {
  companyId: string;
  service: ServiceDto;
};

/** Ver: hero with logo and status and the service metrics. Read-only (preset catalogue). Server component. */
export function ServiceShow({ companyId, service }: Props) {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 p-6 pb-14">
      <BackLink href={serviceRoutes.index(companyId)}>Servicios</BackLink>

      <Card className="flex-row flex-wrap items-center justify-between gap-5 rounded-2xl p-5">
        <div className="flex items-center gap-[18px]">
          <ServiceLogo
            name={service.name}
            logoUrl={service.logoUrl}
            className="size-16 rounded-[16px]"
            iconClassName="size-7"
          />
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-extrabold tracking-tight">{service.name}</h1>
              <StatusPill kind={service.active ? 'activo' : 'inactivo'} />
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              <span className="text-muted-foreground inline-flex items-center gap-1.5 text-[13.5px] font-medium">
                <Hash className="size-3.5 opacity-80" />
                {service.code}
              </span>
              <span className="text-muted-foreground inline-flex items-center gap-1.5 text-[13.5px] font-medium">
                <Users className="size-3.5 opacity-80" />
                {service.maxProfiles} perfil{service.maxProfiles !== 1 ? 'es' : ''} máx.
              </span>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        <MiniStat label="Máximo de perfiles" value={service.maxProfiles} icon={Users} />
        <MiniStat label="Código" value={service.code} icon={Hash} />
        <MiniStat label="Creado" value={formatDate(service.createdAt)} icon={CalendarDays} />
      </div>
    </div>
  );
}
