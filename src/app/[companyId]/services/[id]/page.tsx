import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { db } from '@/db/client';
import { guardPage, hasPermission } from '@/modules/shared/auth/require-permission';
import { isUuid } from '@/modules/shared/uuid';
import { SERVICE_PERMISSIONS } from '@/modules/service/permissions';
import { createServiceContainer } from '@/modules/service/container';
import { ServiceNotFoundException } from '@/modules/service/exceptions/service-not-found.exception';
import { toServiceDto } from '@/modules/service/serializers/service.serializer';
import { ServiceShow } from '@/modules/service/ui/components/ServiceShow';

export const metadata: Metadata = { title: 'Servicio' };

type Props = { params: Promise<{ companyId: string; id: string }> };

/** Ver. */
export default async function ServiceShowPage({ params }: Props) {
  const { companyId, id } = await params;
  await guardPage(companyId, SERVICE_PERMISSIONS.SHOW);
  if (!isUuid(id)) notFound();

  let row;
  try {
    row = await createServiceContainer(db).findService.execute(id, companyId);
  } catch (error) {
    if (error instanceof ServiceNotFoundException) notFound();
    throw error;
  }

  const [canUpdate, canUpdateStatus] = await Promise.all([
    hasPermission(companyId, SERVICE_PERMISSIONS.UPDATE),
    hasPermission(companyId, SERVICE_PERMISSIONS.UPDATE_STATUS),
  ]);

  return (
    <ServiceShow
      companyId={companyId}
      service={toServiceDto(row)}
      canUpdate={canUpdate}
      canUpdateStatus={canUpdateStatus}
    />
  );
}
