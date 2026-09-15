import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { db } from '@/db/client';
import { guardPage, hasPermission } from '@/modules/shared/auth/require-permission';
import { isUuid } from '@/modules/shared/uuid';
import { CLIENT_PERMISSIONS } from '@/modules/client/permissions';
import { SALE_PERMISSIONS } from '@/modules/sale/permissions';
import { createClientContainer } from '@/modules/client/container';
import { ClientNotFoundException } from '@/modules/client/exceptions/client-not-found.exception';
import { toClientDto, toClientSaleDto } from '@/modules/client/serializers/client.serializer';
import { ClientShow } from '@/modules/client/ui/components/ClientShow';

export const metadata: Metadata = { title: 'Cliente' };

type Props = { params: Promise<{ companyId: string; id: string }> };

/** Ver. */
export default async function ClientShowPage({ params }: Props) {
  const { companyId, id } = await params;
  await guardPage(companyId, CLIENT_PERMISSIONS.SHOW);
  if (!isUuid(id)) notFound();

  let overview;
  try {
    overview = await createClientContainer(db).overviewService.execute(id, companyId);
  } catch (error) {
    if (error instanceof ClientNotFoundException) notFound();
    throw error;
  }

  const [canUpdate, canUpdateStatus, canCreateSale] = await Promise.all([
    hasPermission(companyId, CLIENT_PERMISSIONS.UPDATE),
    hasPermission(companyId, CLIENT_PERMISSIONS.UPDATE_STATUS),
    hasPermission(companyId, SALE_PERMISSIONS.CREATE),
  ]);

  return (
    <ClientShow
      companyId={companyId}
      client={toClientDto(overview.client)}
      sales={overview.sales.map(toClientSaleDto)}
      metrics={overview.metrics}
      canUpdate={canUpdate}
      canUpdateStatus={canUpdateStatus}
      canCreateSale={canCreateSale}
    />
  );
}
