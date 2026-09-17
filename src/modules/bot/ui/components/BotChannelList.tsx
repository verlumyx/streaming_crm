'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Edit, MoreHorizontal, Plus, Power, Radio } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { botRoutes } from '@/modules/bot/routes';
import { updateBotChannelStatusAction } from '@/app/[companyId]/bot/channels/actions';
import type { BotChannelDto } from '@/modules/bot/serializers/bot-channel.serializer';

const COLUMNS = 'lg:grid-cols-[1fr_2fr_1.4fr_0.9fr_0.9fr]';

const PROVIDER_LABEL: Record<BotChannelDto['provider'], string> = {
  whatsapp: 'WhatsApp',
  telegram: 'Telegram',
};

export function BotChannelList({ companyId, channels }: { companyId: string; channels: BotChannelDto[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const toggleStatus = (channel: BotChannelDto) => {
    startTransition(async () => {
      const result = await updateBotChannelStatusAction(
        companyId,
        channel.id,
        channel.status === 'active' ? 'inactive' : 'active',
      );
      if (result?.status === 'error') toast.error(result.message ?? 'No se pudo cambiar el estado.');
    });
  };

  return (
    <PageShell
      title="Canales"
      subtitle="Los números de WhatsApp y los bots de Telegram por los que atiende el asistente."
      actions={
        <Button
          className="h-10 rounded-[11px] px-4 font-semibold"
          onClick={() => router.push(botRoutes.channelCreate(companyId))}
        >
          <Plus />
          Conectar canal
        </Button>
      }
    >
      <ListGrid>
        <ListGridHeader columns={COLUMNS}>
          <ListGridHeadCell>Plataforma</ListGridHeadCell>
          <ListGridHeadCell>Canal</ListGridHeadCell>
          <ListGridHeadCell>Último evento</ListGridHeadCell>
          <ListGridHeadCell>Estado</ListGridHeadCell>
          <ListGridHeadCell align="right">Acciones</ListGridHeadCell>
        </ListGridHeader>
        <ListGridBody>
          {channels.map((channel) => (
            <ListGridRow
              key={channel.id}
              columns={COLUMNS}
              onClick={() => router.push(botRoutes.channelEdit(companyId, channel.id))}
            >
              <div className="hidden lg:block">
                <span className="font-semibold">{PROVIDER_LABEL[channel.provider]}</span>
              </div>
              <div className="flex min-w-0 flex-col">
                <span className="truncate font-bold">{channel.displayName}</span>
                <span className="text-muted-foreground truncate font-mono text-[12.5px]">{channel.externalId}</span>
              </div>
              <div className="hidden lg:block">
                <span className="text-muted-foreground text-[13px]">
                  {channel.lastEventAt ? new Date(channel.lastEventAt).toLocaleString('es') : 'Sin actividad'}
                </span>
                {channel.lastError && <p className="text-bad truncate text-[12.5px]">{channel.lastError}</p>}
              </div>
              <div className="hidden lg:block">
                <StatusPill kind={channel.status === 'inactive' ? 'inactivo' : 'activo'} />
              </div>
              <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="bg-card rounded-[10px]" aria-label="Opciones">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => router.push(botRoutes.channelEdit(companyId, channel.id))}>
                      <Edit className="mr-2 size-4" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem disabled={pending} onSelect={() => toggleStatus(channel)}>
                      <Power className="mr-2 size-4" />
                      {channel.status === 'active' ? 'Desactivar' : 'Activar'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </ListGridRow>
          ))}
          {channels.length === 0 && (
            <EmptyState
              icon={Radio}
              title="Sin canales conectados"
              description="Conecta tu número de WhatsApp de la API oficial de Meta o tu bot de Telegram para empezar a recibir mensajes."
              action={
                <Button onClick={() => router.push(botRoutes.channelCreate(companyId))}>
                  <Plus className="mr-2 size-4" />
                  Conectar canal
                </Button>
              }
            />
          )}
        </ListGridBody>
        <ListFooter shown={channels.length} total={channels.length} noun="canal" nounPlural="canales" />
      </ListGrid>
    </PageShell>
  );
}
