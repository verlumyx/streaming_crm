'use client';

import type { BotSettingsDto } from '@/modules/bot/serializers/bot-settings.serializer';
import { BotSettingsFormProvider } from '../contexts/BotSettingsFormContext';
import { useBotSettingsForm } from '../hooks/useBotSettingsForm';
import { BotSettingsForm } from './BotSettingsForm';

/** Configuración: instantiates the form hook and exposes it through the context. */
export function BotSettingsEdit({ companyId, settings }: { companyId: string; settings: BotSettingsDto }) {
  const form = useBotSettingsForm(companyId, settings);

  return (
    <BotSettingsFormProvider value={form}>
      <BotSettingsForm />
    </BotSettingsFormProvider>
  );
}
