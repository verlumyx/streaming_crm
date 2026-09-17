'use client';

import { useActionState, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { initialActionState } from '@/modules/shared/actions/action-state';
import { createBotChannelAction, updateBotChannelAction } from '@/app/[companyId]/bot/channels/actions';
import type { BotProvider } from '@/modules/bot/models/bot-channel.model';
import type { BotChannelDto } from '@/modules/bot/serializers/bot-channel.serializer';

export type BotChannelFormData = {
  id: string;
  provider: BotProvider;
  externalId: string;
  displayName: string;
  accessToken: string;
  appSecret: string;
  verifyToken: string;
  wabaId: string;
  graphApiVersion: string;
  active: boolean;
};

type Options =
  | { mode: 'create'; companyId: string; initialId: string; channel?: undefined }
  | { mode: 'edit'; companyId: string; channel: BotChannelDto; initialId?: undefined };

export function useBotChannelForm(options: Options) {
  const { mode, companyId, channel } = options;

  const [data, setDataState] = useState<BotChannelFormData>(() => ({
    id: channel?.id ?? options.initialId ?? '',
    provider: channel?.provider ?? 'whatsapp',
    externalId: channel?.externalId ?? '',
    displayName: channel?.displayName ?? '',
    // Secrets are never sent back to the browser: an empty field means "keep the stored one".
    accessToken: '',
    appSecret: '',
    verifyToken: '',
    wabaId: channel?.wabaId ?? '',
    graphApiVersion: channel?.graphApiVersion ?? 'v21.0',
    active: channel?.status === 'active',
  }));

  const action =
    mode === 'create'
      ? createBotChannelAction.bind(null, companyId)
      : updateBotChannelAction.bind(null, companyId, channel.id);

  const [state, formAction, pending] = useActionState(action, initialActionState);

  useEffect(() => {
    if (state.status === 'error' && state.message && !state.fieldErrors) toast.error(state.message);
  }, [state]);

  const setData = <K extends keyof BotChannelFormData>(key: K, value: BotChannelFormData[K]) =>
    setDataState((prev) => ({ ...prev, [key]: value }));

  return { mode, data, setData, formAction, pending, errors: state.fieldErrors ?? {}, channel };
}
