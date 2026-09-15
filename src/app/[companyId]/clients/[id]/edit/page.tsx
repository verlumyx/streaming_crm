import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { db } from '@/db/client';
import { guardPage } from '@/modules/shared/auth/require-permission';
import { isUuid } from '@/modules/shared/uuid';
import { PageShell } from '@/components/page-shell';
import { BackLink } from '@/components/back-link';
import { CLIENT_PERMISSIONS } from '@/modules/client/permissions';
import { clientRoutes } from '@/modules/client/routes';
import { createClientContainer } from '@/modules/client/container';
import { ClientNotFoundException } from '@/modules/client/exceptions/client-not-found.exception';
import { toClientDto } from '@/modules/client/serializers/client.serializer';
import { ClientEdit } from '@/modules/client/ui/components/ClientEdit';

export const metadata: Metadata = { title: 'Editar cliente' };

type Props = { params: Promise<{ companyId: string; id: string }> };

/** Editar (form). */
export default async function ClientEditPage({ params }: Props) {
  const { companyId, id } = await params;
  await guardPage(companyId, CLIENT_PERMISSIONS.UPDATE);
  if (!isUuid(id)) notFound();

  let row;
  try {
    row = await createClientContainer(db).findService.execute(id, companyId);
  } catch (error) {
    if (error instanceof ClientNotFoundException) notFound();
    throw error;
  }

  const client = toClientDto(row);

  return (
    <PageShell
      back={<BackLink href={clientRoutes.show(companyId, client.id)}>{client.name}</BackLink>}
      title="Editar cliente"
      subtitle="Modifica la información de contacto del cliente"
    >
      <ClientEdit companyId={companyId} client={client} />
    </PageShell>
  );
}
