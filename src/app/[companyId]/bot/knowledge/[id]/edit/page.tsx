import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { db } from '@/db/client';
import { PageShell } from '@/components/page-shell';
import { BackLink } from '@/components/back-link';
import { guardPage } from '@/modules/shared/auth/require-permission';
import { isUuid } from '@/modules/shared/uuid';
import { BOT_PERMISSIONS } from '@/modules/bot/permissions';
import { botRoutes } from '@/modules/bot/routes';
import { createKnowledgeContainer } from '@/modules/knowledge/container';
import { toKnowledgeDocumentDto } from '@/modules/knowledge/serializers/knowledge.serializer';
import { KnowledgeDocumentNotFoundException } from '@/modules/knowledge/exceptions/knowledge-document-not-found.exception';
import { KnowledgeEdit } from '@/modules/knowledge/ui/components/KnowledgeEdit';

export const metadata: Metadata = { title: 'Editar documento' };

type Props = { params: Promise<{ companyId: string; id: string }> };

/** Editar. */
export default async function KnowledgeEditPage({ params }: Props) {
  const { companyId, id } = await params;
  await guardPage(companyId, BOT_PERMISSIONS.KNOWLEDGE_MANAGE);
  if (!isUuid(id)) notFound();

  let document;
  try {
    document = await createKnowledgeContainer(db).findService.execute(id, companyId);
  } catch (error) {
    if (error instanceof KnowledgeDocumentNotFoundException) notFound();
    throw error;
  }

  return (
    <PageShell
      back={<BackLink href={botRoutes.knowledgeShow(companyId, id)}>{document.title}</BackLink>}
      title="Editar documento"
      subtitle="Al cambiar el contenido, el documento vuelve a la cola de indexado."
    >
      <KnowledgeEdit companyId={companyId} document={toKnowledgeDocumentDto(document)} />
    </PageShell>
  );
}
