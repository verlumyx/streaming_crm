import type { Metadata } from 'next';
import { db } from '@/db/client';
import { guardPage } from '@/modules/shared/auth/require-permission';
import { ACCOUNT_PERMISSIONS } from '@/modules/account/permissions';
import { createAccountContainer } from '@/modules/account/container';
import { createServiceContainer } from '@/modules/service/container';
import { searchAccountSchema } from '@/modules/account/validation/search-account.schema';
import { SearchAccountCommand } from '@/modules/account/commands/search-account.command';
import { toAccountListItemDto } from '@/modules/account/serializers/account.serializer';
import { toServiceOptionDto } from '@/modules/service/serializers/service.serializer';
import { AccountList } from '@/modules/account/ui/components/AccountList';

export const metadata: Metadata = { title: 'Cuentas' };

type Props = {
  params: Promise<{ companyId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Listar. */
export default async function AccountsPage({ params, searchParams }: Props) {
  const { companyId } = await params;
  await guardPage(companyId, ACCOUNT_PERMISSIONS.LIST);

  const input = searchAccountSchema.parse(await searchParams);
  const command = SearchAccountCommand.fromInput(input, companyId);
  const { data, total } = await createAccountContainer(db).searchService.execute(command);
  const services = await createServiceContainer(db).listActiveService.execute(companyId);

  return (
    <AccountList
      companyId={companyId}
      accounts={data.map(toAccountListItemDto)}
      services={services.map(toServiceOptionDto)}
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
