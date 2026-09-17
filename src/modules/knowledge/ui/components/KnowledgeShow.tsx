'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Edit, Power, RefreshCw } from 'lucide-react';
import { StatusPill } from '@/components/status-pill';
import { PageShell } from '@/components/page-shell';
import { BackLink } from '@/components/back-link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { botRoutes } from '@/modules/bot/routes';
import {
  reingestKnowledgeDocumentAction,
  updateKnowledgeDocumentStatusAction,
} from '@/app/[companyId]/bot/knowledge/actions';
import type { KnowledgeDocumentDto } from '@/modules/knowledge/serializers/knowledge.serializer';
import { KnowledgeIngestPill } from './KnowledgeIngestPill';

type Props = { companyId: string; document: KnowledgeDocumentDto; canManage: boolean };

export function KnowledgeShow({ companyId, document, canManage }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const run = (action: () => Promise<{ status: string; message?: string } | undefined>) =>
    startTransition(async () => {
      const result = await action();
      if (result?.status === 'error') toast.error(result.message ?? 'No se pudo completar la acción.');
    });

  return (
    <PageShell
      back={<BackLink href={botRoutes.knowledge(companyId)}>Base de conocimiento</BackLink>}
      title={document.title}
      subtitle={`${document.code} · ${document.chunkCount} fragmento${document.chunkCount === 1 ? '' : 's'} indexado${document.chunkCount === 1 ? '' : 's'}`}
      actions={
        canManage && (
          <>
            <Button
              variant="outline"
              className="h-[42px] rounded-[10px]"
              disabled={pending}
              onClick={() => run(() => reingestKnowledgeDocumentAction(companyId, document.id))}
            >
              <RefreshCw className="size-4" />
              Reindexar
            </Button>
            <Button
              variant="outline"
              className="h-[42px] rounded-[10px]"
              disabled={pending}
              onClick={() =>
                run(() =>
                  updateKnowledgeDocumentStatusAction(
                    companyId,
                    document.id,
                    document.status === 'active' ? 'inactive' : 'active',
                    'show',
                  ),
                )
              }
            >
              <Power className="size-4" />
              {document.status === 'active' ? 'Inactivar' : 'Activar'}
            </Button>
            <Button
              className="h-[42px] rounded-[10px]"
              onClick={() => router.push(botRoutes.knowledgeEdit(companyId, document.id))}
            >
              <Edit className="size-4" />
              Editar
            </Button>
          </>
        )
      }
    >
      {document.ingestStatus === 'failed' && document.ingestError && (
        <Alert variant="destructive">
          <AlertTitle>No se pudo indexar</AlertTitle>
          <AlertDescription>{document.ingestError}</AlertDescription>
        </Alert>
      )}

      <Card className="flex flex-wrap items-center gap-3 rounded-2xl p-5">
        <StatusPill kind={document.status === 'inactive' ? 'inactivo' : 'activo'} />
        <KnowledgeIngestPill status={document.ingestStatus} />
        <span className="text-muted-foreground text-[13px]">
          {document.indexedAt
            ? `Indexado el ${new Date(document.indexedAt).toLocaleString('es')}${document.embeddingModel ? ` con ${document.embeddingModel}` : ''}`
            : 'Todavía no se ha indexado.'}
        </span>
      </Card>

      <Card className="rounded-2xl p-5">
        <pre className="text-[13.5px] leading-relaxed whitespace-pre-wrap">{document.content}</pre>
      </Card>
    </PageShell>
  );
}
