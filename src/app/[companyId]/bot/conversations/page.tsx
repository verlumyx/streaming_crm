import type { Metadata } from 'next';
import { db } from '@/db/client';
import { guardPage } from '@/modules/shared/auth/require-permission';
import { BOT_PERMISSIONS } from '@/modules/bot/permissions';
import { createConversationContainer } from '@/modules/conversation/container';
import { searchConversationSchema } from '@/modules/conversation/validation/search-conversation.schema';
import { toConversationDto } from '@/modules/conversation/serializers/conversation.serializer';
import { ConversationList } from '@/modules/conversation/ui/components/ConversationList';

export const metadata: Metadata = { title: 'Conversaciones' };

type Props = {
  params: Promise<{ companyId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Listar. */
export default async function ConversationsPage({ params, searchParams }: Props) {
  const { companyId } = await params;
  await guardPage(companyId, BOT_PERMISSIONS.CONVERSATIONS);

  const { limit, offset, ...filters } = searchConversationSchema.parse(await searchParams);
  const { data, total } = await createConversationContainer(db).searchService.execute({
    companyId,
    ...filters,
    limit,
    offset,
  });

  return (
    <ConversationList
      companyId={companyId}
      conversations={data.map((row) => toConversationDto(row))}
      meta={{ total, limit, offset, hasMore: total > offset + limit }}
      filters={filters}
    />
  );
}
