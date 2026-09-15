import type { Metadata } from 'next';
import { db } from '@/db/client';
import { guardPage } from '@/modules/shared/auth/require-permission';
import { REFUND_PERMISSIONS } from '@/modules/refund/permissions';
import { createRefundContainer } from '@/modules/refund/container';
import { searchRefundSchema } from '@/modules/refund/validation/search-refund.schema';
import { SearchRefundCommand } from '@/modules/refund/commands/search-refund.command';
import { toRefundListItemDto } from '@/modules/refund/serializers/refund.serializer';
import { RefundList } from '@/modules/refund/ui/components/RefundList';

export const metadata: Metadata = { title: 'Reembolsos' };

type Props = {
  params: Promise<{ companyId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Listar. */
export default async function RefundsPage({ params, searchParams }: Props) {
  const { companyId } = await params;
  await guardPage(companyId, REFUND_PERMISSIONS.LIST);

  const command = SearchRefundCommand.fromInput(searchRefundSchema.parse(await searchParams), companyId);
  const { data, total } = await createRefundContainer(db).searchService.execute(command);

  return (
    <RefundList
      companyId={companyId}
      refunds={data.map(toRefundListItemDto)}
      meta={{ total, limit: command.limit, offset: command.offset, hasMore: total > command.offset + command.limit }}
      filters={command.filters}
    />
  );
}
