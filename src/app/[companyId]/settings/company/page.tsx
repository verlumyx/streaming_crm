import type { Metadata } from 'next';
import { requireSessionUser } from '@/modules/shared/auth/session';
import { getAccessibleCompanies } from '@/modules/shared/auth/membership';
import { toSettingsCompanyDto } from '@/modules/settings/serializers/settings-company.serializer';
import { DefaultCompanyList } from '@/modules/settings/ui/components/DefaultCompanyList';

export const metadata: Metadata = { title: 'Empresa predeterminada' };

type Props = { params: Promise<{ companyId: string }> };

/** Empresa predeterminada: companies the user can work in, the default one marked with a star. */
export default async function SettingsCompanyPage({ params }: Props) {
  const { companyId } = await params;
  const sessionUser = await requireSessionUser();

  const companies = await getAccessibleCompanies(sessionUser.id, Boolean(sessionUser.isSystemOwner));

  return <DefaultCompanyList companyId={companyId} companies={companies.map(toSettingsCompanyDto)} />;
}
