import { Suspense } from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { Plus } from 'lucide-react';
import { db } from '@/db/client';
import { todayIsoDate } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { PageShell } from '@/components/page-shell';
import { requireCompanyAccess } from '@/modules/shared/auth/require-company-access';
import { hasPermission } from '@/modules/shared/auth/require-permission';
import { SALE_PERMISSIONS } from '@/modules/sale/permissions';
import { saleRoutes } from '@/modules/sale/routes';
import { createDashboardContainer } from '@/modules/dashboard/container';
import { MONTH_LONG_LABELS, shiftMonth } from '@/modules/dashboard/domain/months';
import { DashboardStats } from '@/modules/dashboard/ui/components/DashboardStats';
import { DashboardRevenueChart } from '@/modules/dashboard/ui/components/DashboardRevenueChart';
import { DashboardOccupancy } from '@/modules/dashboard/ui/components/DashboardOccupancy';
import { DashboardPlatforms } from '@/modules/dashboard/ui/components/DashboardPlatforms';
import { DashboardExpirations } from '@/modules/dashboard/ui/components/DashboardExpirations';
import { CardSkeleton, StatsSkeleton } from '@/modules/dashboard/ui/components/DashboardSkeletons';

export const metadata: Metadata = { title: 'Resumen' };

type Props = { params: Promise<{ companyId: string }> };
type BlockProps = { companyId: string; today: string };

/**
 * Resumen. No role permission (the menu entry is always visible); company access is re-checked here because
 * pages render in parallel with the layout. Each block streams independently behind its own Suspense boundary.
 */
export default async function DashboardPage({ params }: Props) {
  const { companyId } = await params;
  await requireCompanyAccess(companyId);

  const today = todayIsoDate();
  const { month, year } = shiftMonth(today, 0);
  const canSell = await hasPermission(companyId, SALE_PERMISSIONS.CREATE);

  return (
    <PageShell
      title="Resumen"
      subtitle={`Tu negocio de streaming de un vistazo · ${MONTH_LONG_LABELS[month - 1]} ${year}`}
      actions={
        canSell && (
          <Button
            asChild
            className="h-10 rounded-[11px] px-4 font-semibold shadow-[0_4px_12px_color-mix(in_srgb,var(--primary)_28%,transparent)]"
          >
            <Link href={saleRoutes.create(companyId)}>
              <Plus />
              Nueva venta
            </Link>
          </Button>
        )
      }
    >
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <Suspense fallback={<StatsSkeleton />}>
          <MetricsBlock companyId={companyId} today={today} />
        </Suspense>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.7fr_1fr]">
        <Suspense fallback={<CardSkeleton className="h-[300px]" />}>
          <RevenueBlock companyId={companyId} today={today} />
        </Suspense>
        <Suspense fallback={<CardSkeleton className="h-[260px]" />}>
          <OccupancyBlock companyId={companyId} today={today} />
        </Suspense>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.25fr_1fr]">
        <Suspense fallback={<CardSkeleton className="h-[300px]" />}>
          <ExpirationsBlock companyId={companyId} today={today} />
        </Suspense>
        <Suspense fallback={<CardSkeleton className="h-[300px]" />}>
          <PlatformsBlock companyId={companyId} today={today} />
        </Suspense>
      </div>
    </PageShell>
  );
}

async function MetricsBlock({ companyId, today }: BlockProps) {
  const metrics = await createDashboardContainer(db).metricsService.execute(companyId, today);
  return <DashboardStats metrics={metrics} />;
}

async function RevenueBlock({ companyId, today }: BlockProps) {
  const data = await createDashboardContainer(db).revenueService.execute(companyId, today);
  return <DashboardRevenueChart data={data} />;
}

async function OccupancyBlock({ companyId }: BlockProps) {
  const occupancy = await createDashboardContainer(db).occupancyService.execute(companyId);
  return <DashboardOccupancy occupancy={occupancy} />;
}

async function ExpirationsBlock({ companyId, today }: BlockProps) {
  const expirations = await createDashboardContainer(db).expirationsService.execute(companyId, today);
  return <DashboardExpirations companyId={companyId} expirations={expirations} />;
}

async function PlatformsBlock({ companyId }: BlockProps) {
  const platforms = await createDashboardContainer(db).platformsService.execute(companyId);
  return <DashboardPlatforms platforms={platforms} />;
}
