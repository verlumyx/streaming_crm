import type { Metadata } from 'next';
import { db } from '@/db/client';
import { guardPage } from '@/modules/shared/auth/require-permission';
import { CLIENT_PERMISSIONS } from '@/modules/client/permissions';
import { createClientContainer } from '@/modules/client/container';
import { searchClientSchema } from '@/modules/client/validation/search-client.schema';
import { SearchClientCommand } from '@/modules/client/commands/search-client.command';
import { toClientDto } from '@/modules/client/serializers/client.serializer';
import { ClientList } from '@/modules/client/ui/components/ClientList';

export const metadata: Metadata = { title: 'Clientes' };

type Props = {
  params: Promise<{ companyId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Listar. */
export default async function ClientsPage({ params, searchParams }: Props) {
  const { companyId } = await params;
  await guardPage(companyId, CLIENT_PERMISSIONS.LIST);

  const input = searchClientSchema.parse(await searchParams);
  const command = SearchClientCommand.fromInput(input, companyId);
  const { data, total, platforms } = await createClientContainer(db).searchService.execute(command);

  return (
    <ClientList
      companyId={companyId}
      clients={data.map((row) => toClientDto(row, platforms[row.id]))}
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
