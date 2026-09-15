import type { Metadata } from 'next';
import { db } from '@/db/client';
import { guardPage } from '@/modules/shared/auth/require-permission';
import { uuidv7 } from '@/modules/shared/uuid';
import { PageShell } from '@/components/page-shell';
import { BackLink } from '@/components/back-link';
import { PLAN_PERMISSIONS } from '@/modules/plan/permissions';
import { planRoutes } from '@/modules/plan/routes';
import { createServiceContainer } from '@/modules/service/container';
import { toServiceOptionDto } from '@/modules/service/serializers/service.serializer';
import { PlanCreate } from '@/modules/plan/ui/components/PlanCreate';

export const metadata: Metadata = { title: 'Nuevo plan' };

type Props = { params: Promise<{ companyId: string }> };

/** Crear (form). The draft id is generated here so server and client render the same value. */
export default async function PlanCreatePage({ params }: Props) {
  const { companyId } = await params;
  await guardPage(companyId, PLAN_PERMISSIONS.CREATE);

  const activeServices = await createServiceContainer(db).listActiveService.execute(companyId);

  return (
    <PageShell
      back={<BackLink href={planRoutes.index(companyId)}>Planes</BackLink>}
      title="Nuevo plan"
      subtitle="Arma un plan vendible sobre un servicio del catálogo"
    >
      <PlanCreate companyId={companyId} initialId={uuidv7()} services={activeServices.map(toServiceOptionDto)} />
    </PageShell>
  );
}
