import type { Metadata } from 'next';
import Link from 'next/link';
import { BookOpen, ListChecks, MessagesSquare, Radio, Settings } from 'lucide-react';
import { db } from '@/db/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageShell } from '@/components/page-shell';
import { StatusPill } from '@/components/status-pill';
import { guardPage, hasPermission } from '@/modules/shared/auth/require-permission';
import { BOT_PERMISSIONS } from '@/modules/bot/permissions';
import { createBotContainer } from '@/modules/bot/container';
import { botRoutes } from '@/modules/bot/routes';

export const metadata: Metadata = { title: 'Bot IA' };

type Props = { params: Promise<{ companyId: string }> };

const SECTIONS = [
  {
    href: botRoutes.conversations,
    permission: BOT_PERMISSIONS.CONVERSATIONS,
    icon: MessagesSquare,
    title: 'Conversaciones',
    description: 'Hilos de WhatsApp y Telegram, con la opción de tomar el control.',
  },
  {
    href: botRoutes.knowledge,
    permission: BOT_PERMISSIONS.KNOWLEDGE,
    icon: BookOpen,
    title: 'Base de conocimiento',
    description: 'Lo que el asistente sabe de tu negocio: políticas, precios, preguntas frecuentes.',
  },
  {
    href: botRoutes.channels,
    permission: BOT_PERMISSIONS.CHANNELS,
    icon: Radio,
    title: 'Canales',
    description: 'El número de WhatsApp y el bot de Telegram conectados a esta empresa.',
  },
  {
    href: botRoutes.events,
    permission: BOT_PERMISSIONS.EVENTS,
    icon: ListChecks,
    title: 'Cola de eventos',
    description: 'Mensajes entrantes pendientes, reintentos y errores.',
  },
] as const;

export default async function BotPage({ params }: Props) {
  const { companyId } = await params;
  await guardPage(companyId, BOT_PERMISSIONS.SHOW);

  const settings = await createBotContainer(db).settingsFindService.execute(companyId);
  const [canConfigure, ...sectionPermissions] = await Promise.all([
    hasPermission(companyId, BOT_PERMISSIONS.CONFIGURE),
    ...SECTIONS.map((section) => hasPermission(companyId, section.permission)),
  ]);

  return (
    <PageShell
      title="Bot IA"
      subtitle="Atiende WhatsApp y Telegram, responde con tu base de conocimiento y deja las ventas por aprobar."
      actions={
        canConfigure && (
          <Button asChild variant="outline" className="h-[42px] rounded-[10px]">
            <Link href={botRoutes.settings(companyId)}>
              <Settings className="size-4" />
              Configuración
            </Link>
          </Button>
        )
      }
    >
      <Card className="flex flex-wrap items-center justify-between gap-4 rounded-2xl p-5">
        <div>
          <div className="text-base font-bold tracking-tight">
            {settings ? settings.assistantName : 'Asistente sin preparar'}
          </div>
          <p className="text-muted-foreground mt-0.5 text-[13px]">
            {settings
              ? settings.status === 'active'
                ? 'Respondiendo los mensajes entrantes.'
                : 'Preparado pero inactivo: los mensajes se guardan sin respuesta automática.'
              : 'Todavía no se ha creado el vendedor del bot para esta empresa.'}
          </p>
        </div>
        <StatusPill kind={settings?.status === 'active' ? 'activo' : 'inactivo'} />
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {SECTIONS.map((section, index) =>
          sectionPermissions[index] ? (
            <Link key={section.title} href={section.href(companyId)}>
              <Card className="hover:border-primary flex h-full flex-row items-start gap-4 rounded-2xl p-5 transition-colors">
                <span className="bg-primary-soft text-primary grid size-10 shrink-0 place-items-center rounded-[10px]">
                  <section.icon className="size-5" />
                </span>
                <div className="min-w-0">
                  <div className="text-[15px] font-bold tracking-tight">{section.title}</div>
                  <p className="text-muted-foreground mt-0.5 text-[13px]">{section.description}</p>
                </div>
              </Card>
            </Link>
          ) : null,
        )}
      </div>
    </PageShell>
  );
}
