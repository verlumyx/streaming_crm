import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { db } from '@/db/client';
import { guardPage, hasPermission } from '@/modules/shared/auth/require-permission';
import { isUuid } from '@/modules/shared/uuid';
import { BOT_PERMISSIONS } from '@/modules/bot/permissions';
import { createKnowledgeContainer } from '@/modules/knowledge/container';
import { toKnowledgeDocumentDto } from '@/modules/knowledge/serializers/knowledge.serializer';
import { KnowledgeDocumentNotFoundException } from '@/modules/knowledge/exceptions/knowledge-document-not-found.exception';
import { KnowledgeShow } from '@/modules/knowledge/ui/components/KnowledgeShow';

export const metadata: Metadata = { title: 'Documento' };

type Props = { params: Promise<{ companyId: string; id: string }> };

/** Ver. */
export default async function KnowledgeShowPage({ params }: Props) {
  const { companyId, id } = await params;
  await guardPage(companyId, BOT_PERMISSIONS.KNOWLEDGE);
  if (!isUuid(id)) notFound();

  let document;
  try {
    document = await createKnowledgeContainer(db).findService.execute(id, companyId);
  } catch (error) {
    if (error instanceof KnowledgeDocumentNotFoundException) notFound();
    throw error;
  }

  const canManage = await hasPermission(companyId, BOT_PERMISSIONS.KNOWLEDGE_MANAGE);

  return <KnowledgeShow companyId={companyId} document={toKnowledgeDocumentDto(document)} canManage={canManage} />;
}
