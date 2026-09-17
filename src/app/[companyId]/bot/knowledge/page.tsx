import type { Metadata } from 'next';
import { db } from '@/db/client';
import { guardPage } from '@/modules/shared/auth/require-permission';
import { BOT_PERMISSIONS } from '@/modules/bot/permissions';
import { createKnowledgeContainer } from '@/modules/knowledge/container';
import { searchKnowledgeDocumentSchema } from '@/modules/knowledge/validation/search-knowledge-document.schema';
import { SearchKnowledgeDocumentCommand } from '@/modules/knowledge/commands/search-knowledge-document.command';
import { toKnowledgeDocumentDto } from '@/modules/knowledge/serializers/knowledge.serializer';
import { KnowledgeList } from '@/modules/knowledge/ui/components/KnowledgeList';

export const metadata: Metadata = { title: 'Base de conocimiento' };

type Props = {
  params: Promise<{ companyId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Listar. */
export default async function KnowledgePage({ params, searchParams }: Props) {
  const { companyId } = await params;
  await guardPage(companyId, BOT_PERMISSIONS.KNOWLEDGE);

  const input = searchKnowledgeDocumentSchema.parse(await searchParams);
  const command = SearchKnowledgeDocumentCommand.fromInput(input, companyId);
  const { data, total } = await createKnowledgeContainer(db).searchService.execute(command);

  return (
    <KnowledgeList
      companyId={companyId}
      documents={data.map(toKnowledgeDocumentDto)}
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
