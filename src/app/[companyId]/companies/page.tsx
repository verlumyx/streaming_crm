import type { Metadata } from 'next';
import { db } from '@/db/client';
import { guardSystemOwnerPage } from '@/modules/shared/auth/require-permission';
import { createCompanyContainer } from '@/modules/company/container';
import { searchCompanySchema } from '@/modules/company/validation/search-company.schema';
import { SearchCompanyCommand } from '@/modules/company/commands/search-company.command';
import { toCompanyDto } from '@/modules/company/serializers/company.serializer';
import { CompanyList } from '@/modules/company/ui/components/CompanyList';

export const metadata: Metadata = { title: 'Empresas' };

type Props = {
  params: Promise<{ companyId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Listar. System owner only. */
export default async function CompaniesPage({ params, searchParams }: Props) {
  const { companyId } = await params;
  await guardSystemOwnerPage(companyId);

  const input = searchCompanySchema.parse(await searchParams);
  const command = SearchCompanyCommand.fromInput(input);
  const { data, total } = await createCompanyContainer(db).searchService.execute(command);

  return (
    <CompanyList
      companyId={companyId}
      companies={data.map(toCompanyDto)}
      meta={{
        total,
        limit: command.limit,
        offset: command.offset,
        hasMore: total > command.offset + command.limit,
      }}
      filters={command.filters}
    />
  );
}
