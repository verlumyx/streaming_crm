import type { Metadata } from 'next';
import { guardPage } from '@/modules/shared/auth/require-permission';
import { uuidv7 } from '@/modules/shared/uuid';
import { PageShell } from '@/components/page-shell';
import { BackLink } from '@/components/back-link';
import { CLIENT_PERMISSIONS } from '@/modules/client/permissions';
import { clientRoutes } from '@/modules/client/routes';
import { ClientCreate } from '@/modules/client/ui/components/ClientCreate';

export const metadata: Metadata = { title: 'Nuevo cliente' };

type Props = { params: Promise<{ companyId: string }> };

/** Crear (form). The draft id is generated here so server and client render the same value. */
export default async function ClientCreatePage({ params }: Props) {
  const { companyId } = await params;
  await guardPage(companyId, CLIENT_PERMISSIONS.CREATE);

  return (
    <PageShell
      back={<BackLink href={clientRoutes.index(companyId)}>Clientes</BackLink>}
      title="Nuevo cliente"
      subtitle="Registra los datos del cliente y, si quieres, su primer perfil"
    >
      <ClientCreate companyId={companyId} initialId={uuidv7()} />
    </PageShell>
  );
}
