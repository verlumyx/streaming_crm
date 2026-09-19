import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { db } from '@/db/client';
import { guardPage, hasPermission } from '@/modules/shared/auth/require-permission';
import { isUuid } from '@/modules/shared/uuid';
import { CLAIM_PERMISSIONS } from '@/modules/claim/permissions';
import { createClaimContainer } from '@/modules/claim/container';
import { ClaimNotFoundException } from '@/modules/claim/exceptions/claim-not-found.exception';
import { toClaimDto } from '@/modules/claim/serializers/claim.serializer';
import { ClaimShow } from '@/modules/claim/ui/components/ClaimShow';

export const metadata: Metadata = { title: 'Reclamo' };

type Props = { params: Promise<{ companyId: string; id: string }> };

/** Ver. */
export default async function ClaimShowPage({ params }: Props) {
  const { companyId, id } = await params;
  await guardPage(companyId, CLAIM_PERMISSIONS.SHOW);
  if (!isUuid(id)) notFound();

  let row;
  try {
    row = await createClaimContainer(db).findService.execute(id, companyId);
  } catch (error) {
    if (error instanceof ClaimNotFoundException) notFound();
    throw error;
  }

  const [canUpdate, canUpdateStatus] = await Promise.all([
    hasPermission(companyId, CLAIM_PERMISSIONS.UPDATE),
    hasPermission(companyId, CLAIM_PERMISSIONS.UPDATE_STATUS),
  ]);

  const claim = toClaimDto(row);

  return (
    <ClaimShow
      // Remonta tras un cambio de estado para que el formulario muestre los valores frescos.
      key={claim.updatedAt ?? claim.createdAt}
      companyId={companyId}
      claim={claim}
      canUpdate={canUpdate}
      canUpdateStatus={canUpdateStatus}
    />
  );
}
