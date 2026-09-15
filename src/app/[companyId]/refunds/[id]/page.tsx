import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { db } from '@/db/client';
import { guardPage, hasPermission } from '@/modules/shared/auth/require-permission';
import { isUuid } from '@/modules/shared/uuid';
import { REFUND_PERMISSIONS } from '@/modules/refund/permissions';
import { createRefundContainer } from '@/modules/refund/container';
import { RefundNotFoundException } from '@/modules/refund/exceptions/refund-not-found.exception';
import { toRefundDto } from '@/modules/refund/serializers/refund.serializer';
import { RefundShow } from '@/modules/refund/ui/components/RefundShow';

export const metadata: Metadata = { title: 'Reembolso' };

type Props = {
  params: Promise<{ companyId: string; id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

/** Ver. `?edit=1` opens the inline edit form (Editar has no page of its own, as in the original). */
export default async function RefundShowPage({ params, searchParams }: Props) {
  const { companyId, id } = await params;
  await guardPage(companyId, REFUND_PERMISSIONS.SHOW);
  if (!isUuid(id)) notFound();

  let overview;
  try {
    overview = await createRefundContainer(db).findService.execute(id, companyId);
  } catch (error) {
    if (error instanceof RefundNotFoundException) notFound();
    throw error;
  }

  const [canUpdate, canApprove, canReject] = await Promise.all([
    hasPermission(companyId, REFUND_PERMISSIONS.UPDATE),
    hasPermission(companyId, REFUND_PERMISSIONS.APPROVE),
    hasPermission(companyId, REFUND_PERMISSIONS.REJECT),
  ]);

  const refund = toRefundDto(overview);
  const query = (await searchParams) ?? {};
  const wantsEdit = (Array.isArray(query.edit) ? query.edit[0] : query.edit) === '1';

  return (
    <RefundShow
      // Remount after an update so the inline form closes and shows the fresh values.
      key={refund.updatedAt ?? refund.createdAt}
      companyId={companyId}
      refund={refund}
      canUpdate={canUpdate}
      canApprove={canApprove}
      canReject={canReject}
      initialEditing={wantsEdit && refund.isPending && canUpdate}
    />
  );
}
