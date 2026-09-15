import type { Metadata } from 'next';
import { db } from '@/db/client';
import { guardPage } from '@/modules/shared/auth/require-permission';
import { SALE_PERMISSIONS } from '@/modules/sale/permissions';
import { createSaleContainer } from '@/modules/sale/container';
import { searchSaleSchema } from '@/modules/sale/validation/search-sale.schema';
import { SearchSaleCommand } from '@/modules/sale/commands/search-sale.command';
import { toSaleClientOptionDto, toSaleDto } from '@/modules/sale/serializers/sale.serializer';
import { SaleList } from '@/modules/sale/ui/components/SaleList';

export const metadata: Metadata = { title: 'Ventas' };

type Props = {
  params: Promise<{ companyId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Listar. */
export default async function SalesPage({ params, searchParams }: Props) {
  const { companyId } = await params;
  await guardPage(companyId, SALE_PERMISSIONS.LIST);

  const input = searchSaleSchema.parse(await searchParams);
  const command = SearchSaleCommand.fromInput(input, companyId);
  const container = createSaleContainer(db);
  const [{ data, total }, options] = await Promise.all([
    container.searchService.execute(command),
    container.listOptionsService.execute(companyId),
  ]);
  const context = { today: command.today, graceDays: container.graceDays };

  return (
    <SaleList
      companyId={companyId}
      sales={data.map((row) => toSaleDto(row, context))}
      meta={{
        total,
        limit: command.limit,
        offset: command.offset,
        hasMore: total > command.offset + command.limit,
      }}
      filters={command.filters}
      clients={options.clients.map(toSaleClientOptionDto)}
      services={options.services}
      agents={options.agents}
    />
  );
}
