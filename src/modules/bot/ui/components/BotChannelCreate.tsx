'use client';

import { BotChannelFormProvider } from '../contexts/BotChannelFormContext';
import { useBotChannelForm } from '../hooks/useBotChannelForm';
import { BotChannelForm } from './BotChannelForm';

/** Crear: the webhook URL only exists once the channel has an id. */
export function BotChannelCreate({ companyId, initialId }: { companyId: string; initialId: string }) {
  const form = useBotChannelForm({ mode: 'create', companyId, initialId });

  return (
    <BotChannelFormProvider value={form}>
      <BotChannelForm companyId={companyId} webhookUrl={null} />
    </BotChannelFormProvider>
  );
}
