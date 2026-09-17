'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ListChecks, RefreshCw } from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { botRoutes } from '@/modules/bot/routes';
import { requeueBotEventAction } from '@/app/[companyId]/bot/events/actions';
import type { BotEventDto } from '@/modules/bot/serializers/bot-event.serializer';
import type { BotEventStatus } from '@/modules/bot/models/bot-event.model';

const COLUMNS = 'lg:grid-cols-[1fr_2.4fr_0.9fr_0.7fr_0.9fr]';

const STATUS: Record<BotEventStatus, { label: string; className: string }> = {
  pending: { label: 'En cola', className: 'bg-warn-soft text-warn' },
  processing: { label: 'Procesando', className: 'bg-info-soft text-info' },
  completed: { label: 'Completado', className: 'bg-ok-soft text-ok' },
  failed: { label: 'Reintentando', className: 'bg-warn-soft text-warn' },
  dlq: { label: 'Cola muerta', className: 'bg-bad-soft text-bad' },
  discarded: { label: 'Descartado', className: 'bg-mute-soft text-mute' },
};

type Props = {
  companyId: string;
  events: BotEventDto[];
  totals: Record<BotEventStatus, number>;
  meta: { total: number; limit: number; offset: number; hasMore: boolean };
  status?: BotEventStatus;
};

export function BotEventList({ companyId, events, totals, meta, status }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const requeue = (event: BotEventDto) => {
    startTransition(async () => {
      const result = await requeueBotEventAction(companyId, event.id);
      if (result?.status === 'error') toast.error(result.message ?? 'No se pudo reencolar.');
    });
  };

  return (
    <PageShell
      title="Cola de eventos"
      subtitle="Cada mensaje entrante se guarda antes de responder, así nada se pierde si algo falla."
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        {(Object.keys(STATUS) as BotEventStatus[]).map((key) => (
          <div key={key} className="bg-card rounded-[10px] border p-3">
            <div className="text-muted-foreground text-[11.5px] font-bold tracking-wider uppercase">
              {STATUS[key].label}
            </div>
            <div className="mt-1 text-xl font-extrabold tabular-nums">{totals[key]}</div>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-lg border p-4">
        <div className="max-w-xs space-y-2">
          <Label htmlFor="filter-status">Estado</Label>
          <SearchableSelect
            id="filter-status"
            options={[
              { value: 'todos', label: 'Todos' },
              ...(Object.keys(STATUS) as BotEventStatus[]).map((key) => ({ value: key, label: STATUS[key].label })),
            ]}
            value={status ?? 'todos'}
            onChange={(value) =>
              router.push(
                botRoutes.events(companyId, !value || value === 'todos' ? undefined : { status: value }),
              )
            }
            placeholder="Estado"
            emptyText="Sin resultados"
          />
        </div>
      </div>

      <ListGrid>
        <ListGridHeader columns={COLUMNS}>
          <ListGridHeadCell>Contacto</ListGridHeadCell>
          <ListGridHeadCell>Mensaje</ListGridHeadCell>
          <ListGridHeadCell>Estado</ListGridHeadCell>
          <ListGridHeadCell>Intentos</ListGridHeadCell>
          <ListGridHeadCell align="right">Acciones</ListGridHeadCell>
        </ListGridHeader>
        <ListGridBody>
          {events.map((event) => (
            <ListGridRow key={event.id} columns={COLUMNS} className="cursor-default">
              <div className="flex min-w-0 flex-col">
                <span className="truncate font-semibold">{event.contactExternalId}</span>
                <span className="text-muted-foreground truncate text-[12.5px]">
                  {new Date(event.createdAt).toLocaleString('es')}
                </span>
              </div>
              <div className="min-w-0">
                <p className="truncate text-[13.5px]">{event.preview ?? '[sin texto]'}</p>
                {event.lastError && <p className="text-bad truncate text-[12.5px]">{event.lastError}</p>}
              </div>
              <div className="hidden lg:block">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12.5px] font-bold whitespace-nowrap ${STATUS[event.status].className}`}
                >
                  <span className="size-1.5 rounded-full bg-current opacity-85" />
                  {STATUS[event.status].label}
                </span>
              </div>
              <div className="hidden tabular-nums lg:block">
                {event.attempts}/{event.maxAttempts}
              </div>
              <div className="flex items-center justify-end">
                {(event.status === 'dlq' || event.status === 'failed') && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-[10px]"
                    disabled={pending}
                    onClick={() => requeue(event)}
                  >
                    <RefreshCw className="size-4" />
                    Reintentar
                  </Button>
                )}
              </div>
            </ListGridRow>
          ))}
          {events.length === 0 && (
            <EmptyState icon={ListChecks} title="Sin eventos" description="Todavía no ha entrado ningún mensaje." />
          )}
        </ListGridBody>
        <ListFooter shown={events.length} total={meta.total} noun="evento">
          <ListPagination meta={meta} href={(query) => botRoutes.events(companyId, query)} />
        </ListFooter>
      </ListGrid>
    </PageShell>
  );
}
