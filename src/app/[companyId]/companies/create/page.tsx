import type { Metadata } from 'next';
import { guardSystemOwnerPage } from '@/modules/shared/auth/require-permission';
import { uuidv7 } from '@/modules/shared/uuid';
import { PageShell } from '@/components/page-shell';
import { BackLink } from '@/components/back-link';
import { companyRoutes } from '@/modules/company/routes';
import { CompanyCreate } from '@/modules/company/ui/components/CompanyCreate';

export const metadata: Metadata = { title: 'Nueva empresa' };

type Props = { params: Promise<{ companyId: string }> };

/** Crear (form). The draft id is generated here so server and client render the same value. */
export default async function CompanyCreatePage({ params }: Props) {
  const { companyId } = await params;
  await guardSystemOwnerPage(companyId);

  return (
    <PageShell
      back={<BackLink href={companyRoutes.index(companyId)}>Empresas</BackLink>}
      title="Nueva empresa"
      subtitle="Completa la información para crear una nueva empresa"
    >
      <CompanyCreate companyId={companyId} initialId={uuidv7()} />
    </PageShell>
  );
}
