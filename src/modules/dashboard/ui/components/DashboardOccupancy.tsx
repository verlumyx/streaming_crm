import { Sparkles } from 'lucide-react';
import { ProgressRing } from '@/components/progress-ring';
import { Card } from '@/components/ui/card';
import type { DashboardOccupancyDto } from '@/modules/dashboard/serializers/dashboard.serializer';

/** Profile inventory: occupied vs free. */
export function DashboardOccupancy({ occupancy }: { occupancy: DashboardOccupancyDto }) {
  const { occupied, available, total } = occupancy;

  return (
    <Card className="gap-0 rounded-2xl py-0">
      <div className="p-5 pb-0">
        <div className="text-base font-bold tracking-tight">Ocupación de perfiles</div>
        <div className="text-muted-foreground mt-0.5 text-[13px]">Inventario disponible</div>
      </div>
      <div className="flex items-center gap-5 p-5 pt-3">
        <ProgressRing value={occupied} total={total} />
        <div className="flex flex-1 flex-col gap-2.5">
          <div className="flex items-center gap-2 text-sm">
            <span className="bg-primary size-[11px] rounded-[4px]" />
            <span className="text-muted-foreground font-semibold">Ocupados</span>
            <span className="ml-auto text-base font-extrabold">{occupied}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="bg-input size-[11px] rounded-[4px]" />
            <span className="text-muted-foreground font-semibold">Libres</span>
            <span className="ml-auto text-base font-extrabold">{available}</span>
          </div>
          <div className="bg-primary-soft text-primary mt-1.5 flex items-center gap-1.5 rounded-[10px] px-2.5 py-2 text-[12.5px] font-semibold">
            <Sparkles className="size-3.5 shrink-0" />
            {available} perfiles listos para vender
          </div>
        </div>
      </div>
    </Card>
  );
}
