import type { Metadata } from 'next';
import { db } from '@/db/client';
import { guardPage } from '@/modules/shared/auth/require-permission';
import { uuidv7 } from '@/modules/shared/uuid';
import { PageShell } from '@/components/page-shell';
import { BackLink } from '@/components/back-link';
import { CLAIM_PERMISSIONS } from '@/modules/claim/permissions';
import { createClaimContainer } from '@/modules/claim/container';
import { claimRoutes } from '@/modules/claim/routes';
import { toClaimClientOptionDto } from '@/modules/claim/serializers/claim.serializer';
import { ClaimCreate } from '@/modules/claim/ui/components/ClaimCreate';

export const metadata: Metadata = { title: 'Nuevo reclamo' };

type Props = {
  params: Promise<{ companyId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

/** Crear (form). `?clientId=` preselecciona el cliente (enlace desde su ficha). */
export default async function ClaimCreatePage({ params, searchParams }: Props) {
  const { companyId } = await params;
  await guardPage(companyId, CLAIM_PERMISSIONS.CREATE);

  const query = (await searchParams) ?? {};
  const requestedClientId = Array.isArray(query.clientId) ? query.clientId[0] : query.clientId;
  const { clients, preselectedClientId } = await createClaimContainer(db).formService.execute(
    companyId,
    requestedClientId,
  );

  return (
    <PageShell
      className="max-w-2xl"
      back={<BackLink href={claimRoutes.index(companyId)}>Reclamos</BackLink>}
      title="Nuevo reclamo"
      subtitle="Registra el reclamo levantado por un cliente."
    >
      <ClaimCreate
        companyId={companyId}
        initialId={uuidv7()}
        clients={clients.map(toClaimClientOptionDto)}
        preselectedClientId={preselectedClientId}
      />
    </PageShell>
  );
}
