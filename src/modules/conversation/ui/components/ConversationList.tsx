'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessagesSquare } from 'lucide-react';
import { InitialsAvatar } from '@/components/initials-avatar';
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
import type { ConversationDto } from '@/modules/conversation/serializers/conversation.serializer';
import type { ConversationFilters, ConversationMeta } from '../types/Conversation';

const COLUMNS = 'lg:grid-cols-[0.9fr_2.2fr_1fr_1fr_1.1fr]';

const PROVIDER_LABEL = { whatsapp: 'WhatsApp', telegram: 'Telegram' } as const;

function HandlerPill({ handledBy }: { handledBy: ConversationDto['handledBy'] }) {
  const isHuman = handledBy === 'human';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12.5px] font-bold whitespace-nowrap ${
        isHuman ? 'bg-warn-soft text-warn' : 'bg-info-soft text-info'
      }`}
    >
      <span className="size-1.5 rounded-full bg-current opacity-85" />
      {isHuman ? 'Un agente' : 'El asistente'}
    </span>
  );
}

type Props = {
  companyId: string;
  conversations: ConversationDto[];
  meta: ConversationMeta;
  filters: ConversationFilters;
};

export function ConversationList({ companyId, conversations, meta, filters: initialFilters }: Props) {
  const router = useRouter();
  const [filters, setFilters] = useState<ConversationFilters>(initialFilters);

  const applyFilters = (next: ConversationFilters) => {
    setFilters(next);
    router.push(botRoutes.conversations(companyId, next));
  };

  return (
    <PageShell
      title="Conversaciones"
      subtitle="Todo lo que entra por WhatsApp y Telegram, responda el asistente o una persona."
    >
      <div className="bg-card rounded-lg border p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="filter-status">Estado</Label>
            <SearchableSelect
              id="filter-status"
              options={[
                { value: 'todas', label: 'Todas' },
                { value: 'open', label: 'Abiertas' },
                { value: 'closed', label: 'Cerradas' },
              ]}
              value={filters.status ?? 'todas'}
              onChange={(value) =>
                applyFilters({
                  ...filters,
                  status: !value || value === 'todas' ? undefined : (value as ConversationFilters['status']),
                })
              }
              placeholder="Estado"
              emptyText="Sin resultados"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="filter-handled">Atiende</Label>
            <SearchableSelect
              id="filter-handled"
              options={[
                { value: 'todos', label: 'Todos' },
                { value: 'bot', label: 'El asistente' },
                { value: 'human', label: 'Un agente' },
              ]}
              value={filters.handledBy ?? 'todos'}
              onChange={(value) =>
                applyFilters({
                  ...filters,
                  handledBy: !value || value === 'todos' ? undefined : (value as ConversationFilters['handledBy']),
                })
              }
              placeholder="Atiende"
              emptyText="Sin resultados"
            />
          </div>
          <div className="flex items-end">
            <Button variant="outline" onClick={() => applyFilters({})}>
              Limpiar
            </Button>
          </div>
        </div>
      </div>

      <ListGrid>
        <ListGridHeader columns={COLUMNS}>
          <ListGridHeadCell>Código</ListGridHeadCell>
          <ListGridHeadCell>Contacto</ListGridHeadCell>
          <ListGridHeadCell>Canal</ListGridHeadCell>
          <ListGridHeadCell>Atiende</ListGridHeadCell>
          <ListGridHeadCell align="right">Último mensaje</ListGridHeadCell>
        </ListGridHeader>
        <ListGridBody>
          {conversations.map((conversation) => (
            <ListGridRow
              key={conversation.id}
              columns={COLUMNS}
              onClick={() => router.push(botRoutes.conversationShow(companyId, conversation.id))}
            >
              <div className="hidden lg:block">
                <span className="text-muted-foreground font-semibold tabular-nums">{conversation.code}</span>
              </div>
              <div className="flex items-center gap-3">
                <InitialsAvatar name={conversation.contact.displayName ?? conversation.contact.externalId} size={40} />
                <div className="flex min-w-0 flex-col">
                  <span className="truncate font-bold">
                    {conversation.contact.displayName ?? conversation.contact.externalId}
                  </span>
                  <span className="text-muted-foreground truncate text-[12.5px]">
                    {conversation.contact.phoneE164 ?? conversation.contact.externalId}
                    {conversation.contact.status === 'blocked' && ' · bloqueado'}
                  </span>
                </div>
              </div>
              <div className="hidden lg:block">
                <span className="text-[13px] font-semibold">{PROVIDER_LABEL[conversation.contact.provider]}</span>
              </div>
              <div className="hidden lg:block">
                <HandlerPill handledBy={conversation.handledBy} />
              </div>
              <div className="text-muted-foreground text-right text-[13px]">
                {conversation.lastMessageAt ? new Date(conversation.lastMessageAt).toLocaleString('es') : '—'}
              </div>
            </ListGridRow>
          ))}
          {conversations.length === 0 && (
            <EmptyState
              icon={MessagesSquare}
              title="Sin conversaciones"
              description="Cuando alguien escriba al número o al bot conectados, la conversación aparecerá aquí."
            />
          )}
        </ListGridBody>
        <ListFooter shown={conversations.length} total={meta.total} noun="conversación" nounPlural="conversaciones">
          <ListPagination meta={meta} href={(query) => botRoutes.conversations(companyId, query)} />
        </ListFooter>
      </ListGrid>
    </PageShell>
  );
}
