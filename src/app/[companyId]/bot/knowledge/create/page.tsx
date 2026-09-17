import type { Metadata } from 'next';
import { PageShell } from '@/components/page-shell';
import { BackLink } from '@/components/back-link';
import { guardPage } from '@/modules/shared/auth/require-permission';
import { uuidv7 } from '@/modules/shared/uuid';
import { BOT_PERMISSIONS } from '@/modules/bot/permissions';
import { botRoutes } from '@/modules/bot/routes';
import { KnowledgeCreate } from '@/modules/knowledge/ui/components/KnowledgeCreate';

export const metadata: Metadata = { title: 'Nuevo documento' };

type Props = { params: Promise<{ companyId: string }> };

/** Crear. */
export default async function KnowledgeCreatePage({ params }: Props) {
  const { companyId } = await params;
  await guardPage(companyId, BOT_PERMISSIONS.KNOWLEDGE_MANAGE);

  return (
    <PageShell
      back={<BackLink href={botRoutes.knowledge(companyId)}>Base de conocimiento</BackLink>}
      title="Nuevo documento"
      subtitle="Se indexará automáticamente para que el asistente pueda citarlo."
    >
      <KnowledgeCreate companyId={companyId} initialId={uuidv7()} />
    </PageShell>
  );
}
