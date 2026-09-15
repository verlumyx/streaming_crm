'use client';

import { useActionState, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { initialActionState } from '@/modules/shared/actions/action-state';
import { splitPhone } from '@/lib/phone';
import { createClientAction, updateClientAction } from '@/app/[companyId]/clients/actions';
import type { ClientDto } from '@/modules/client/serializers/client.serializer';

export type ClientFormData = {
  id: string;
  name: string;
  phonePrefix: string;
  phone: string;
  email: string;
  notes: string;
};

type Options =
  | { mode: 'create'; companyId: string; initialId: string; client?: undefined }
  | { mode: 'edit'; companyId: string; client: ClientDto; initialId?: undefined };

export function useClientForm(options: Options) {
  const { mode, companyId, client } = options;

  const [data, setDataState] = useState<ClientFormData>(() => {
    const phone = splitPhone(client?.phone);
    return {
      id: client?.id ?? options.initialId ?? '',
      name: client?.name ?? '',
      phonePrefix: phone.prefix,
      phone: phone.number,
      email: client?.email ?? '',
      notes: client?.notes ?? '',
    };
  });

  // companyId / id are bound here — the action never reads them from FormData.
  const action =
    mode === 'create' ? createClientAction.bind(null, companyId) : updateClientAction.bind(null, companyId, client.id);

  const [state, formAction, pending] = useActionState(action, initialActionState);

  useEffect(() => {
    if (state.status === 'error' && state.message && !state.fieldErrors) toast.error(state.message);
  }, [state]);

  const setData = <K extends keyof ClientFormData>(key: K, value: ClientFormData[K]) =>
    setDataState((prev) => ({ ...prev, [key]: value }));

  return { mode, data, setData, formAction, pending, errors: state.fieldErrors ?? {} };
}
