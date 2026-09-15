import { ServiceBadge } from '@/components/service-badge';
import { Card } from '@/components/ui/card';
import { platformVisual } from '@/lib/platform-visual';
import type { DashboardPlatformDto } from '@/modules/dashboard/serializers/dashboard.serializer';

/** Sold profiles per platform with bars in derived brand colors. */
export function DashboardPlatforms({ platforms }: { platforms: DashboardPlatformDto[] }) {
  const max = Math.max(1, ...platforms.map((p) => p.occupied));

  return (
    <Card className="gap-0 rounded-2xl py-0">
      <div className="p-5 pb-0">
        <div className="text-base font-bold tracking-tight">Perfiles por plataforma</div>
      </div>
      {platforms.length === 0 ? (
        <div className="text-muted-foreground p-5 pt-4 text-[13px]">Aún no hay perfiles vendidos.</div>
      ) : (
        <div className="flex flex-col gap-3 p-5 pt-4">
          {platforms.map((p) => (
            <div key={p.id} className="flex items-center gap-2.5">
              <ServiceBadge name={p.name} size={26} />
              <span className="w-[92px] shrink-0 truncate text-[13.5px] font-semibold">{p.name}</span>
              <div className="bg-muted h-[9px] flex-1 overflow-hidden rounded-full">
                <div
                  className="h-full rounded-full transition-[width] duration-700"
                  style={{ width: `${(p.occupied / max) * 100}%`, background: platformVisual(p.name).color }}
                />
              </div>
              <span className="w-[22px] text-right text-[13.5px] font-bold tabular-nums">{p.occupied}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
