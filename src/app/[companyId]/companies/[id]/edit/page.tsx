import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { db } from '@/db/client';
import { guardSystemOwnerPage } from '@/modules/shared/auth/require-permission';
import { isUuid } from '@/modules/shared/uuid';
import { PageShell } from '@/components/page-shell';
import { BackLink } from '@/components/back-link';
import { companyRoutes } from '@/modules/company/routes';
import { createCompanyContainer } from '@/modules/company/container';
import { CompanyNotFoundException } from '@/modules/company/exceptions/company-not-found.exception';
import { toCompanyDto } from '@/modules/company/serializers/company.serializer';
import { CompanyEdit } from '@/modules/company/ui/components/CompanyEdit';

export const metadata: Metadata = { title: 'Editar empresa' };

type Props = { params: Promise<{ companyId: string; id: string }> };

/** Editar (form). */
export default async function CompanyEditPage({ params }: Props) {
  const { companyId, id } = await params;
  await guardSystemOwnerPage(companyId);
  if (!isUuid(id)) notFound();

  let row;
  try {
    row = await createCompanyContainer(db).findService.execute(id);
  } catch (error) {
    if (error instanceof CompanyNotFoundException) notFound();
    throw error;
  }

  const company = toCompanyDto(row);

  return (
    <PageShell
      back={<BackLink href={companyRoutes.show(companyId, company.id)}>{company.name}</BackLink>}
      title="Editar empresa"
      subtitle="Modifica la información de la empresa"
    >
      <CompanyEdit companyId={companyId} company={company} />
    </PageShell>
  );
}
