import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { db } from '@/db/client';
import { guardPage, hasPermission } from '@/modules/shared/auth/require-permission';
import { isUuid } from '@/modules/shared/uuid';
import { transactionCatalog } from '@/modules/transaction/models/transaction.model';
import { MANUAL_TRANSACTION_PERMISSIONS } from '@/modules/manual-transaction/permissions';
import { createManualTransactionContainer } from '@/modules/manual-transaction/container';
import { ManualTransactionNotFoundException } from '@/modules/manual-transaction/exceptions/manual-transaction-not-found.exception';
import { toManualTransactionDto } from '@/modules/manual-transaction/serializers/manual-transaction.serializer';
import { ManualTransactionShow } from '@/modules/manual-transaction/ui/components/ManualTransactionShow';

export const metadata: Metadata = { title: 'Transacción manual' };

type Props = { params: Promise<{ companyId: string; id: string }> };

/** Ver. */
export default async function ManualTransactionShowPage({ params }: Props) {
  const { companyId, id } = await params;
  await guardPage(companyId, MANUAL_TRANSACTION_PERMISSIONS.SHOW);
  if (!isUuid(id)) notFound();

  let row;
  try {
    row = await createManualTransactionContainer(db).findService.execute(id, companyId);
  } catch (error) {
    if (error instanceof ManualTransactionNotFoundException) notFound();
    throw error;
  }

  const [canApprove, canCancel] = await Promise.all([
    hasPermission(companyId, MANUAL_TRANSACTION_PERMISSIONS.APPROVE),
    hasPermission(companyId, MANUAL_TRANSACTION_PERMISSIONS.CANCEL),
  ]);

  return (
    <ManualTransactionShow
      companyId={companyId}
      manualTransaction={toManualTransactionDto(row)}
      catalog={transactionCatalog()}
      canApprove={canApprove}
      canCancel={canCancel}
    />
  );
}
