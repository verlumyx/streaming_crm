'use client';

import { useActionState, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { initialActionState } from '@/modules/shared/actions/action-state';
import { createServiceAction, updateServiceAction } from '@/app/[companyId]/services/actions';
import type { ServiceDto } from '@/modules/service/serializers/service.serializer';

export type ServiceFormData = {
  id: string;
  name: string;
  logoUrl: string;
  maxProfiles: number;
};

type Options =
  | { mode: 'create'; companyId: string; initialId: string; service?: undefined }
  | { mode: 'edit'; companyId: string; service: ServiceDto; initialId?: undefined };

export function useServiceForm(options: Options) {
  const { mode, companyId, service } = options;

  const [data, setDataState] = useState<ServiceFormData>(() => ({
    id: service?.id ?? options.initialId ?? '',
    name: service?.name ?? '',
    logoUrl: service?.logoUrl ?? '',
    maxProfiles: service?.maxProfiles ?? 1,
  }));

  // companyId / id are bound here — the action never reads them from FormData.
  const action =
    mode === 'create'
      ? createServiceAction.bind(null, companyId)
      : updateServiceAction.bind(null, companyId, service.id);

  const [state, formAction, pending] = useActionState(action, initialActionState);

  useEffect(() => {
    if (state.status === 'error' && state.message && !state.fieldErrors) toast.error(state.message);
  }, [state]);

  const setData = <K extends keyof ServiceFormData>(key: K, value: ServiceFormData[K]) =>
    setDataState((prev) => ({ ...prev, [key]: value }));

  return { mode, data, setData, formAction, pending, errors: state.fieldErrors ?? {} };
}
