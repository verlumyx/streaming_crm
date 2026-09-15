import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { db } from '@/db/client';
import { guardPage } from '@/modules/shared/auth/require-permission';
import { isUuid } from '@/modules/shared/uuid';
import { PageShell } from '@/components/page-shell';
import { BackLink } from '@/components/back-link';
import { PLAN_PERMISSIONS } from '@/modules/plan/permissions';
import { planRoutes } from '@/modules/plan/routes';
import { createPlanContainer } from '@/modules/plan/container';
import { PlanNotFoundException } from '@/modules/plan/exceptions/plan-not-found.exception';
import { toPlanDto } from '@/modules/plan/serializers/plan.serializer';
import { createServiceContainer } from '@/modules/service/container';
import { toServiceOptionDto, type ServiceOptionDto } from '@/modules/service/serializers/service.serializer';
import { PlanEdit } from '@/modules/plan/ui/components/PlanEdit';

export const metadata: Metadata = { title: 'Editar plan' };

type Props = { params: Promise<{ companyId: string; id: string }> };

/** Editar (form). */
export default async function PlanEditPage({ params }: Props) {
  const { companyId, id } = await params;
  await guardPage(companyId, PLAN_PERMISSIONS.UPDATE);
  if (!isUuid(id)) notFound();

  let record;
  try {
    record = await createPlanContainer(db).findService.execute(id, companyId);
  } catch (error) {
    if (error instanceof PlanNotFoundException) notFound();
    throw error;
  }

  const plan = toPlanDto(record);
  const services: ServiceOptionDto[] = (await createServiceContainer(db).listActiveService.execute(companyId)).map(
    toServiceOptionDto,
  );
  // Keep the plan's current service selectable even if it was deactivated meanwhile.
  if (!services.some((s) => s.id === plan.serviceId)) {
    services.unshift({ id: plan.service.id, code: plan.service.code, name: plan.service.name, maxProfiles: 0 });
  }

  return (
    <PageShell
      back={<BackLink href={planRoutes.show(companyId, plan.id)}>{plan.name}</BackLink>}
      title="Editar plan"
      subtitle="Modifica los datos del plan del catálogo"
    >
      <PlanEdit companyId={companyId} plan={plan} services={services} />
    </PageShell>
  );
}
