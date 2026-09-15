import type { Metadata } from 'next';
import { guardPage } from '@/modules/shared/auth/require-permission';
import { uuidv7 } from '@/modules/shared/uuid';
import { PageShell } from '@/components/page-shell';
import { BackLink } from '@/components/back-link';
import { SERVICE_PERMISSIONS } from '@/modules/service/permissions';
import { serviceRoutes } from '@/modules/service/routes';
import { ServiceCreate } from '@/modules/service/ui/components/ServiceCreate';

export const metadata: Metadata = { title: 'Nuevo servicio' };

type Props = { params: Promise<{ companyId: string }> };

/** Crear (form). The draft id is generated here so server and client render the same value. */
export default async function ServiceCreatePage({ params }: Props) {
  const { companyId } = await params;
  await guardPage(companyId, SERVICE_PERMISSIONS.CREATE);

  return (
    <PageShell
      back={<BackLink href={serviceRoutes.index(companyId)}>Servicios</BackLink>}
      title="Nuevo servicio"
      subtitle="Agrega una plataforma o servicio a tu catálogo"
    >
      <ServiceCreate companyId={companyId} initialId={uuidv7()} />
    </PageShell>
  );
}
