import type { Metadata } from 'next';
import { db } from '@/db/client';
import { guardPage } from '@/modules/shared/auth/require-permission';
import { PLAN_PERMISSIONS } from '@/modules/plan/permissions';
import { createPlanContainer } from '@/modules/plan/container';
import { searchPlanSchema } from '@/modules/plan/validation/search-plan.schema';
import { SearchPlanCommand } from '@/modules/plan/commands/search-plan.command';
import { toPlanDto } from '@/modules/plan/serializers/plan.serializer';
import { createServiceContainer } from '@/modules/service/container';
import { toServiceOptionDto } from '@/modules/service/serializers/service.serializer';
import { PlanList } from '@/modules/plan/ui/components/PlanList';

export const metadata: Metadata = { title: 'Planes' };

type Props = {
  params: Promise<{ companyId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Listar. The active services feed the service filter. */
export default async function PlansPage({ params, searchParams }: Props) {
  const { companyId } = await params;
  await guardPage(companyId, PLAN_PERMISSIONS.LIST);

  const input = searchPlanSchema.parse(await searchParams);
  const command = SearchPlanCommand.fromInput(input, companyId);
  const [{ data, total }, activeServices] = await Promise.all([
    createPlanContainer(db).searchService.execute(command),
    createServiceContainer(db).listActiveService.execute(companyId),
  ]);

  return (
    <PlanList
      companyId={companyId}
      plans={data.map(toPlanDto)}
      services={activeServices.map(toServiceOptionDto)}
      meta={{
        total,
        limit: command.limit,
        offset: command.offset,
        hasMore: total > command.offset + command.limit,
      }}
      filters={command.filters}
    />
  );
}
