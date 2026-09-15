import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { db } from '@/db/client';
import { guardPage } from '@/modules/shared/auth/require-permission';
import { isUuid } from '@/modules/shared/uuid';
import { PageShell } from '@/components/page-shell';
import { BackLink } from '@/components/back-link';
import { SERVICE_PERMISSIONS } from '@/modules/service/permissions';
import { serviceRoutes } from '@/modules/service/routes';
import { createServiceContainer } from '@/modules/service/container';
import { ServiceNotFoundException } from '@/modules/service/exceptions/service-not-found.exception';
import { toServiceDto } from '@/modules/service/serializers/service.serializer';
import { ServiceEdit } from '@/modules/service/ui/components/ServiceEdit';

export const metadata: Metadata = { title: 'Editar servicio' };

type Props = { params: Promise<{ companyId: string; id: string }> };

/** Editar (form). */
export default async function ServiceEditPage({ params }: Props) {
  const { companyId, id } = await params;
  await guardPage(companyId, SERVICE_PERMISSIONS.UPDATE);
  if (!isUuid(id)) notFound();

  let row;
  try {
    row = await createServiceContainer(db).findService.execute(id, companyId);
  } catch (error) {
    if (error instanceof ServiceNotFoundException) notFound();
    throw error;
  }

  const service = toServiceDto(row);

  return (
    <PageShell
      back={<BackLink href={serviceRoutes.show(companyId, service.id)}>{service.name}</BackLink>}
      title="Editar servicio"
      subtitle="Modifica los datos del servicio del catálogo"
    >
      <ServiceEdit companyId={companyId} service={service} />
    </PageShell>
  );
}
