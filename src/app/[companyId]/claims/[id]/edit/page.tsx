import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { db } from '@/db/client';
import { guardPage } from '@/modules/shared/auth/require-permission';
import { isUuid } from '@/modules/shared/uuid';
import { PageShell } from '@/components/page-shell';
import { BackLink } from '@/components/back-link';
import { CLAIM_PERMISSIONS } from '@/modules/claim/permissions';
import { createClaimContainer } from '@/modules/claim/container';
import { claimRoutes } from '@/modules/claim/routes';
import { ClaimNotFoundException } from '@/modules/claim/exceptions/claim-not-found.exception';
import { toClaimClientOptionDto, toClaimDto } from '@/modules/claim/serializers/claim.serializer';
import { ClaimEdit } from '@/modules/claim/ui/components/ClaimEdit';

export const metadata: Metadata = { title: 'Editar reclamo' };

type Props = { params: Promise<{ companyId: string; id: string }> };

/** Editar (form). Un reclamo cerrado ya no se edita. */
export default async function ClaimEditPage({ params }: Props) {
  const { companyId, id } = await params;
  await guardPage(companyId, CLAIM_PERMISSIONS.UPDATE);
  if (!isUuid(id)) notFound();

  const container = createClaimContainer(db);

  let row;
  try {
    row = await container.findService.execute(id, companyId);
  } catch (error) {
    if (error instanceof ClaimNotFoundException) notFound();
    throw error;
  }

  const claim = toClaimDto(row);
  if (claim.isClosed) notFound();

  const { clients } = await container.formService.execute(companyId, claim.clientId);

  return (
    <PageShell
      className="max-w-2xl"
      back={<BackLink href={claimRoutes.show(companyId, claim.id)}>{claim.code}</BackLink>}
      title="Editar reclamo"
      subtitle="Modifica los datos del reclamo."
    >
      <ClaimEdit companyId={companyId} claim={claim} clients={clients.map(toClaimClientOptionDto)} />
    </PageShell>
  );
}
