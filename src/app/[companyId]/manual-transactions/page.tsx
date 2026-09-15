import type { Metadata } from 'next';
import { db } from '@/db/client';
import { guardPage } from '@/modules/shared/auth/require-permission';
import { MANUAL_TRANSACTION_PERMISSIONS } from '@/modules/manual-transaction/permissions';
import { createManualTransactionContainer } from '@/modules/manual-transaction/container';
import { searchManualTransactionSchema } from '@/modules/manual-transaction/validation/search-manual-transaction.schema';
import { SearchManualTransactionCommand } from '@/modules/manual-transaction/commands/search-manual-transaction.command';
import { toManualTransactionListItemDto } from '@/modules/manual-transaction/serializers/manual-transaction.serializer';
import { ManualTransactionList } from '@/modules/manual-transaction/ui/components/ManualTransactionList';

export const metadata: Metadata = { title: 'Transacciones manuales' };

type Props = {
  params: Promise<{ companyId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Listar. */
export default async function ManualTransactionsPage({ params, searchParams }: Props) {
  const { companyId } = await params;
  await guardPage(companyId, MANUAL_TRANSACTION_PERMISSIONS.LIST);

  const command = SearchManualTransactionCommand.fromInput(searchManualTransactionSchema.parse(await searchParams), companyId);
  const { data, total } = await createManualTransactionContainer(db).searchService.execute(command);

  return (
    <ManualTransactionList
      companyId={companyId}
      manualTransactions={data.map(toManualTransactionListItemDto)}
      meta={{ total, limit: command.limit, offset: command.offset, hasMore: total > command.offset + command.limit }}
      filters={command.filters}
    />
  );
}
