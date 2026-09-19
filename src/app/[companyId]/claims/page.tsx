import type { Metadata } from 'next';
import { db } from '@/db/client';
import { guardPage } from '@/modules/shared/auth/require-permission';
import { CLAIM_PERMISSIONS } from '@/modules/claim/permissions';
import { createClaimContainer } from '@/modules/claim/container';
import { searchClaimSchema } from '@/modules/claim/validation/search-claim.schema';
import { SearchClaimCommand } from '@/modules/claim/commands/search-claim.command';
import { toClaimListItemDto } from '@/modules/claim/serializers/claim.serializer';
import { ClaimList } from '@/modules/claim/ui/components/ClaimList';

export const metadata: Metadata = { title: 'Reclamos' };

type Props = {
  params: Promise<{ companyId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Listar. */
export default async function ClaimsPage({ params, searchParams }: Props) {
  const { companyId } = await params;
  await guardPage(companyId, CLAIM_PERMISSIONS.LIST);

  const command = SearchClaimCommand.fromInput(searchClaimSchema.parse(await searchParams), companyId);
  const { data, total } = await createClaimContainer(db).searchService.execute(command);

  return (
    <ClaimList
      companyId={companyId}
      claims={data.map(toClaimListItemDto)}
      meta={{ total, limit: command.limit, offset: command.offset, hasMore: total > command.offset + command.limit }}
      filters={command.filters}
    />
  );
}
