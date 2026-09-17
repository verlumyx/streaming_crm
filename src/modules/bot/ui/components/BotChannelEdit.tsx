'use client';

import type { BotChannelDto } from '@/modules/bot/serializers/bot-channel.serializer';
import { BotChannelFormProvider } from '../contexts/BotChannelFormContext';
import { useBotChannelForm } from '../hooks/useBotChannelForm';
import { BotChannelForm } from './BotChannelForm';

export function BotChannelEdit({
  companyId,
  channel,
  webhookUrl,
}: {
  companyId: string;
  channel: BotChannelDto;
  webhookUrl: string;
}) {
  const form = useBotChannelForm({ mode: 'edit', companyId, channel });

  return (
    <BotChannelFormProvider value={form}>
      <BotChannelForm companyId={companyId} webhookUrl={webhookUrl} />
    </BotChannelFormProvider>
  );
}
