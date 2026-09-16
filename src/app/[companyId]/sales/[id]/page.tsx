import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { db } from '@/db/client';
import { todayIsoDate } from '@/lib/format';
import { guardPage, hasPermission } from '@/modules/shared/auth/require-permission';
import { isUuid } from '@/modules/shared/uuid';
import { SALE_PERMISSIONS } from '@/modules/sale/permissions';
import { createSaleContainer } from '@/modules/sale/container';
import { SaleNotFoundException } from '@/modules/sale/exceptions/sale-not-found.exception';
import { toSaleAvailableProfileDto, toSaleDetailDto } from '@/modules/sale/serializers/sale.serializer';
import { SaleShow } from '@/modules/sale/ui/components/SaleShow';

export const metadata: Metadata = { title: 'Venta' };

type Props = { params: Promise<{ companyId: string; id: string }> };

/** Ver. */
export default async function SaleShowPage({ params }: Props) {
  const { companyId, id } = await params;
  await guardPage(companyId, SALE_PERMISSIONS.SHOW);
  if (!isUuid(id)) notFound();

  const container = createSaleContainer(db);
  const today = todayIsoDate();

  let overview;
  try {
    overview = await container.findService.execute(id, companyId, today);
  } catch (error) {
    if (error instanceof SaleNotFoundException) notFound();
    throw error;
  }

  const [canRenew, canReactivate, canCancel, canApprove] = await Promise.all([
    hasPermission(companyId, SALE_PERMISSIONS.RENEW),
    hasPermission(companyId, SALE_PERMISSIONS.REACTIVATE),
    hasPermission(companyId, SALE_PERMISSIONS.CANCEL),
    hasPermission(companyId, SALE_PERMISSIONS.APPROVE),
  ]);

  return (
    <SaleShow
      companyId={companyId}
      sale={toSaleDetailDto(overview, { today, graceDays: container.graceDays })}
      replacementProfiles={overview.replacementProfiles.map(toSaleAvailableProfileDto)}
      canRenew={canRenew}
      canReactivate={canReactivate}
      canCancel={canCancel}
      canApprove={canApprove}
    />
  );
}
