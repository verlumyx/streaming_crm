import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { db } from '@/db/client';
import { PageShell } from '@/components/page-shell';
import { BackLink } from '@/components/back-link';
import { guardPage } from '@/modules/shared/auth/require-permission';
import { isUuid } from '@/modules/shared/uuid';
import { BOT_PERMISSIONS } from '@/modules/bot/permissions';
import { botRoutes, botWebhookPaths } from '@/modules/bot/routes';
import { createBotContainer } from '@/modules/bot/container';
import { toBotChannelDto } from '@/modules/bot/serializers/bot-channel.serializer';
import { BotChannelNotFoundException } from '@/modules/bot/exceptions/bot-channel-not-found.exception';
import { BotChannelEdit } from '@/modules/bot/ui/components/BotChannelEdit';

export const metadata: Metadata = { title: 'Editar canal' };

type Props = { params: Promise<{ companyId: string; id: string }> };

/** Editar. */
export default async function BotChannelEditPage({ params }: Props) {
  const { companyId, id } = await params;
  await guardPage(companyId, BOT_PERMISSIONS.CHANNELS);
  if (!isUuid(id)) notFound();

  let channel;
  try {
    channel = await createBotContainer(db).channelFindService.execute(id, companyId);
  } catch (error) {
    if (error instanceof BotChannelNotFoundException) notFound();
    throw error;
  }

  const base = process.env.NEXT_PUBLIC_APP_URL ?? '';
  const webhookUrl = `${base}${
    channel.provider === 'telegram' ? botWebhookPaths.telegram(id) : botWebhookPaths.whatsapp(id)
  }`;

  return (
    <PageShell
      back={<BackLink href={botRoutes.channels(companyId)}>Canales</BackLink>}
      title={channel.displayName}
      subtitle="Deja un campo de credencial vacío para conservar el valor guardado."
    >
      <BotChannelEdit companyId={companyId} channel={toBotChannelDto(channel)} webhookUrl={webhookUrl} />
    </PageShell>
  );
}
