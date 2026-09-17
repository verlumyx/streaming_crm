'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { BookOpen, Edit, Eye, MoreHorizontal, Plus, Power, RefreshCw, Search } from 'lucide-react';
import { StatusPill } from '@/components/status-pill';
import {
  EmptyState,
  ListFooter,
  ListGrid,
  ListGridBody,
  ListGridHeadCell,
  ListGridHeader,
  ListGridRow,
  PageShell,
} from '@/components/page-shell';
import { ListPagination } from '@/components/list-pagination';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { usePermission } from '@/modules/shared/auth/company-context';
import { BOT_PERMISSIONS } from '@/modules/bot/permissions';
import { botRoutes } from '@/modules/bot/routes';
import {
  reingestKnowledgeDocumentAction,
  updateKnowledgeDocumentStatusAction,
} from '@/app/[companyId]/bot/knowledge/actions';
import type { KnowledgeDocumentDto } from '@/modules/knowledge/serializers/knowledge.serializer';
import type { KnowledgeFilters, KnowledgeMeta } from '../types/Knowledge';
import { KnowledgeIngestPill } from './KnowledgeIngestPill';

const COLUMNS = 'lg:grid-cols-[0.8fr_2.4fr_1fr_0.9fr_0.9fr]';

type Props = {
  companyId: string;
  documents: KnowledgeDocumentDto[];
  meta: KnowledgeMeta;
  filters: KnowledgeFilters;
};

export function KnowledgeList({ companyId, documents, meta, filters: initialFilters }: Props) {
  const router = useRouter();
  const { can } = usePermission();
  const [pending, startTransition] = useTransition();
  const [filters, setFilters] = useState<KnowledgeFilters>(initialFilters);

  const canManage = can(BOT_PERMISSIONS.KNOWLEDGE_MANAGE);

  const applyFilters = (next: KnowledgeFilters) => {
    setFilters(next);
    router.push(botRoutes.knowledge(companyId, next));
  };

  const clearFilters = () => {
    setFilters({});
    router.push(botRoutes.knowledge(companyId));
  };

  const toggleStatus = (document: KnowledgeDocumentDto) => {
    startTransition(async () => {
      const result = await updateKnowledgeDocumentStatusAction(
        companyId,
        document.id,
        document.status === 'active' ? 'inactive' : 'active',
      );
      if (result?.status === 'error') toast.error(result.message ?? 'No se pudo cambiar el estado.');
    });
  };

  const reindex = (document: KnowledgeDocumentDto) => {
    startTransition(async () => {
      const result = await reingestKnowledgeDocumentAction(companyId, document.id);
      if (result?.status === 'error') toast.error(result.message ?? 'No se pudo reindexar.');
    });
  };

  return (
    <PageShell
      title="Base de conocimiento"
      subtitle="Lo que el asistente sabe de tu negocio. Solo los documentos activos e indexados se usan al responder."
      actions={
        canManage && (
          <Button className="h-10 rounded-[11px] px-4 font-semibold" onClick={() => router.push(botRoutes.knowledgeCreate(companyId))}>
            <Plus />
            Nuevo documento
          </Button>
        )
      }
    >
      <div className="bg-card rounded-lg border p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="filter-title">Título</Label>
            <Input
              id="filter-title"
              type="text"
              placeholder="Buscar por título..."
              value={filters.title ?? ''}
              onChange={(e) => setFilters({ ...filters, title: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && applyFilters(filters)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="filter-code">Código</Label>
            <Input
              id="filter-code"
              type="text"
              placeholder="DOC000001"
              value={filters.code ?? ''}
              onChange={(e) => setFilters({ ...filters, code: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && applyFilters(filters)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="filter-status">Estado</Label>
            <SearchableSelect
              id="filter-status"
              options={[
                { value: 'todos', label: 'Todos' },
                { value: 'active', label: 'Activos' },
                { value: 'inactive', label: 'Inactivos' },
              ]}
              value={filters.status ?? 'todos'}
              onChange={(value) =>
                applyFilters({
                  ...filters,
                  status: !value || value === 'todos' ? undefined : (value as KnowledgeFilters['status']),
                })
              }
              placeholder="Estado"
              emptyText="Sin resultados"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="filter-ingest">Indexado</Label>
            <SearchableSelect
              id="filter-ingest"
              options={[
                { value: 'todos', label: 'Todos' },
                { value: 'pending', label: 'En cola' },
                { value: 'processing', label: 'Indexando' },
                { value: 'indexed', label: 'Indexado' },
                { value: 'failed', label: 'Falló' },
              ]}
              value={filters.ingestStatus ?? 'todos'}
              onChange={(value) =>
                applyFilters({
                  ...filters,
                  ingestStatus: !value || value === 'todos' ? undefined : (value as KnowledgeFilters['ingestStatus']),
                })
              }
              placeholder="Indexado"
              emptyText="Sin resultados"
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={() => applyFilters(filters)}>
            <Search className="mr-2 size-4" />
            Buscar
          </Button>
          <Button variant="outline" onClick={clearFilters}>
            Limpiar
          </Button>
        </div>
      </div>

      <ListGrid>
        <ListGridHeader columns={COLUMNS}>
          <ListGridHeadCell>Código</ListGridHeadCell>
          <ListGridHeadCell>Documento</ListGridHeadCell>
          <ListGridHeadCell>Indexado</ListGridHeadCell>
          <ListGridHeadCell>Estado</ListGridHeadCell>
          <ListGridHeadCell align="right">Acciones</ListGridHeadCell>
        </ListGridHeader>
        <ListGridBody>
          {documents.map((document) => (
            <ListGridRow
              key={document.id}
              columns={COLUMNS}
              onClick={() => router.push(botRoutes.knowledgeShow(companyId, document.id))}
            >
              <div className="hidden lg:block">
                <span className="text-muted-foreground font-semibold tabular-nums">{document.code}</span>
              </div>
              <div className="flex min-w-0 flex-col">
                <span className="truncate font-bold">{document.title}</span>
                <span className="text-muted-foreground truncate text-[12.5px]">
                  {document.chunkCount} fragmento{document.chunkCount === 1 ? '' : 's'}
                </span>
              </div>
              <div className="hidden lg:block">
                <KnowledgeIngestPill status={document.ingestStatus} />
              </div>
              <div className="hidden lg:block">
                <StatusPill kind={document.status === 'inactive' ? 'inactivo' : 'activo'} />
              </div>
              <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="bg-card rounded-[10px]" aria-label="Opciones">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => router.push(botRoutes.knowledgeShow(companyId, document.id))}>
                      <Eye className="mr-2 size-4" />
                      Ver
                    </DropdownMenuItem>
                    {canManage && (
                      <>
                        <DropdownMenuItem onSelect={() => router.push(botRoutes.knowledgeEdit(companyId, document.id))}>
                          <Edit className="mr-2 size-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem disabled={pending} onSelect={() => reindex(document)}>
                          <RefreshCw className="mr-2 size-4" />
                          Reindexar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem disabled={pending} onSelect={() => toggleStatus(document)}>
                          <Power className="mr-2 size-4" />
                          {document.status === 'active' ? 'Inactivar' : 'Activar'}
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </ListGridRow>
          ))}
          {documents.length === 0 && (
            <EmptyState
              icon={BookOpen}
              title="Sin documentos"
              description="Añade las políticas, los precios y las preguntas frecuentes que el asistente debe conocer."
              action={
                canManage && (
                  <Button onClick={() => router.push(botRoutes.knowledgeCreate(companyId))}>
                    <Plus className="mr-2 size-4" />
                    Nuevo documento
                  </Button>
                )
              }
            />
          )}
        </ListGridBody>
        <ListFooter shown={documents.length} total={meta.total} noun="documento">
          <ListPagination meta={meta} href={(query) => botRoutes.knowledge(companyId, query)} />
        </ListFooter>
      </ListGrid>
    </PageShell>
  );
}
