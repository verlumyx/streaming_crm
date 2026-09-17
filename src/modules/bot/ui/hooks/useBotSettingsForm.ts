'use client';

import { useActionState, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { initialActionState } from '@/modules/shared/actions/action-state';
import { updateBotSettingsAction } from '@/app/[companyId]/bot/actions';
import type { BotSettingsDto } from '@/modules/bot/serializers/bot-settings.serializer';

export type BotSettingsFormData = {
  enabled: boolean;
  assistantName: string;
  personaPrompt: string;
  paymentInstructions: string;
  chatModel: string;
  temperature: number;
  maxToolIterations: number;
  retrievalTopK: number;
  retrievalMinScore: number;
  historyWindow: number;
  handoffEnabled: boolean;
  handoffMinutes: number;
  autoCreateClient: boolean;
  autoCreateSale: boolean;
  contactDailyMessageLimit: number;
};

export function useBotSettingsForm(companyId: string, settings: BotSettingsDto) {
  const [data, setDataState] = useState<BotSettingsFormData>(() => ({
    enabled: settings.status === 'active',
    assistantName: settings.assistantName,
    personaPrompt: settings.personaPrompt ?? '',
    paymentInstructions: settings.paymentInstructions ?? '',
    chatModel: settings.chatModel,
    temperature: settings.temperature,
    maxToolIterations: settings.maxToolIterations,
    retrievalTopK: settings.retrievalTopK,
    retrievalMinScore: settings.retrievalMinScore,
    historyWindow: settings.historyWindow,
    handoffEnabled: settings.handoffEnabled,
    handoffMinutes: settings.handoffMinutes,
    autoCreateClient: settings.autoCreateClient,
    autoCreateSale: settings.autoCreateSale,
    contactDailyMessageLimit: settings.contactDailyMessageLimit,
  }));

  // companyId is bound here — the action never reads it from FormData.
  const [state, formAction, pending] = useActionState(
    updateBotSettingsAction.bind(null, companyId),
    initialActionState,
  );

  useEffect(() => {
    if (state.status === 'error' && state.message && !state.fieldErrors) toast.error(state.message);
  }, [state]);

  const setData = <K extends keyof BotSettingsFormData>(key: K, value: BotSettingsFormData[K]) =>
    setDataState((prev) => ({ ...prev, [key]: value }));

  return { data, setData, formAction, pending, errors: state.fieldErrors ?? {}, settings };
}
