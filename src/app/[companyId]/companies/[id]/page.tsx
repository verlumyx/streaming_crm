import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { db } from '@/db/client';
import { guardSystemOwnerPage } from '@/modules/shared/auth/require-permission';
import { isUuid } from '@/modules/shared/uuid';
import { createCompanyContainer } from '@/modules/company/container';
import { CompanyNotFoundException } from '@/modules/company/exceptions/company-not-found.exception';
import { toCompanyDto } from '@/modules/company/serializers/company.serializer';
import { CompanyShow } from '@/modules/company/ui/components/CompanyShow';

export const metadata: Metadata = { title: 'Empresa' };

type Props = { params: Promise<{ companyId: string; id: string }> };

/** Ver. `id` is the target company; `companyId` is only the active company of the URL. */
export default async function CompanyShowPage({ params }: Props) {
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

  return <CompanyShow companyId={companyId} company={toCompanyDto(row)} />;
}
