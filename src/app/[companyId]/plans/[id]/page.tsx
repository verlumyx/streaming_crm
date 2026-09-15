import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { db } from '@/db/client';
import { guardPage, hasPermission } from '@/modules/shared/auth/require-permission';
import { isUuid } from '@/modules/shared/uuid';
import { PLAN_PERMISSIONS } from '@/modules/plan/permissions';
import { createPlanContainer } from '@/modules/plan/container';
import { PlanNotFoundException } from '@/modules/plan/exceptions/plan-not-found.exception';
import { toPlanDto } from '@/modules/plan/serializers/plan.serializer';
import { PlanShow } from '@/modules/plan/ui/components/PlanShow';

export const metadata: Metadata = { title: 'Plan' };

type Props = { params: Promise<{ companyId: string; id: string }> };

/** Ver. */
export default async function PlanShowPage({ params }: Props) {
  const { companyId, id } = await params;
  await guardPage(companyId, PLAN_PERMISSIONS.SHOW);
  if (!isUuid(id)) notFound();

  let record;
  try {
    record = await createPlanContainer(db).findService.execute(id, companyId);
  } catch (error) {
    if (error instanceof PlanNotFoundException) notFound();
    throw error;
  }

  const [canUpdate, canUpdateStatus] = await Promise.all([
    hasPermission(companyId, PLAN_PERMISSIONS.UPDATE),
    hasPermission(companyId, PLAN_PERMISSIONS.UPDATE_STATUS),
  ]);

  return (
    <PlanShow companyId={companyId} plan={toPlanDto(record)} canUpdate={canUpdate} canUpdateStatus={canUpdateStatus} />
  );
}
