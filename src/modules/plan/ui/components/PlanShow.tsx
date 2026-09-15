import Link from 'next/link';
import { CalendarClock, DollarSign, Edit, Hash, Package, Target, Tv } from 'lucide-react';
import { BackLink } from '@/components/back-link';
import { MiniStat } from '@/components/mini-stat';
import { StatusPill } from '@/components/status-pill';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { clp } from '@/lib/format';
import { planRoutes } from '@/modules/plan/routes';
import type { PlanDto } from '@/modules/plan/serializers/plan.serializer';
import { PLAN_CAPACITY_LABELS } from '../plan-labels';
import { PlanStatusButton } from './PlanStatusButton';

type Props = {
  companyId: string;
  plan: PlanDto;
  canUpdate: boolean;
  canUpdateStatus: boolean;
};

const percentLabel = (value: number) => `${value.toLocaleString('es-CL', { maximumFractionDigits: 2 })}%`;

/** Ver: hero with the plan, its service and capacity, actions and the commercial metrics. Server component. */
export function PlanShow({ companyId, plan, canUpdate, canUpdateStatus }: Props) {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 p-6 pb-14">
      <BackLink href={planRoutes.index(companyId)}>Planes</BackLink>

      <Card className="flex-row flex-wrap items-center justify-between gap-5 rounded-2xl p-5">
        <div className="flex items-center gap-[18px]">
          <span className="bg-muted text-muted-foreground grid size-16 shrink-0 place-items-center rounded-[16px] border">
            <Package className="size-7" />
          </span>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-extrabold tracking-tight">{plan.name}</h1>
              <StatusPill kind={plan.active ? 'activo' : 'inactivo'} />
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              <span className="text-muted-foreground inline-flex items-center gap-1.5 text-[13.5px] font-medium">
                <Hash className="size-3.5 opacity-80" />
                {plan.code}
              </span>
              <span className="text-muted-foreground inline-flex items-center gap-1.5 text-[13.5px] font-medium">
                <Tv className="size-3.5 opacity-80" />
                {plan.service.name}
              </span>
              <span className="text-muted-foreground inline-flex items-center gap-1.5 text-[13.5px] font-medium">
                <Package className="size-3.5 opacity-80" />
                {PLAN_CAPACITY_LABELS[plan.capacity]}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {canUpdateStatus && <PlanStatusButton companyId={companyId} planId={plan.id} active={plan.active} />}
          {canUpdate && (
            <Button asChild variant="outline" className="bg-card h-10 rounded-[11px] px-4 font-semibold">
              <Link href={planRoutes.edit(companyId, plan.id)}>
                <Edit />
                Editar
              </Link>
            </Button>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <MiniStat label="Precio de venta" value={clp(plan.salePrice)} icon={DollarSign} />
        <MiniStat label="Duración" value={`${plan.durationDays} días`} icon={CalendarClock} />
        <MiniStat label="Meta ROI" value={percentLabel(plan.roiTargetPct)} icon={Target} />
        <MiniStat label="Capacidad" value={PLAN_CAPACITY_LABELS[plan.capacity]} icon={Package} />
      </div>
    </div>
  );
}
