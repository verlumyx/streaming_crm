import type { Metadata } from 'next';
import { db } from '@/db/client';
import { guardPage } from '@/modules/shared/auth/require-permission';
import { BOT_PERMISSIONS } from '@/modules/bot/permissions';
import { createBotContainer } from '@/modules/bot/container';
import { toBotChannelDto } from '@/modules/bot/serializers/bot-channel.serializer';
import { BotChannelList } from '@/modules/bot/ui/components/BotChannelList';

export const metadata: Metadata = { title: 'Canales del bot' };

type Props = { params: Promise<{ companyId: string }> };

/** Listar. */
export default async function BotChannelsPage({ params }: Props) {
  const { companyId } = await params;
  await guardPage(companyId, BOT_PERMISSIONS.CHANNELS);

  const channels = await createBotContainer(db).channelListService.execute(companyId);

  return <BotChannelList companyId={companyId} channels={channels.map(toBotChannelDto)} />;
}
