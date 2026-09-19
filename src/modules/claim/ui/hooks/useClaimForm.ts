'use client';

import { useActionState, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { initialActionState } from '@/modules/shared/actions/action-state';
import { createClaimAction, updateClaimAction } from '@/app/[companyId]/claims/actions';
import type { ClaimChannel } from '@/modules/claim/models/claim.model';
import type { ClaimClientOptionDto, ClaimDto } from '@/modules/claim/serializers/claim.serializer';

export type ClaimFormData = {
  id: string;
  clientId: string;
  subject: string;
  description: string;
  channel: ClaimChannel;
};

type Options =
  | {
      mode: 'create';
      companyId: string;
      initialId: string;
      clients: ClaimClientOptionDto[];
      preselectedClientId?: string | null;
      claim?: undefined;
    }
  | {
      mode: 'edit';
      companyId: string;
      claim: ClaimDto;
      clients: ClaimClientOptionDto[];
      initialId?: undefined;
      preselectedClientId?: undefined;
    };

/** Formulario del reclamo (crear / editar). El estado se cambia aparte, desde el detalle. */
export function useClaimForm(options: Options) {
  const { mode, companyId, claim, clients } = options;

  const [data, setDataState] = useState<ClaimFormData>({
    id: claim?.id ?? options.initialId ?? '',
    clientId: claim?.clientId ?? options.preselectedClientId ?? '',
    subject: claim?.subject ?? '',
    description: claim?.description ?? '',
    channel: claim?.channel ?? 'whatsapp',
  });

  // companyId / id se enlazan aquí — la acción nunca los lee del FormData.
  const action =
    mode === 'create' ? createClaimAction.bind(null, companyId) : updateClaimAction.bind(null, companyId, claim.id);

  const [state, formAction, pending] = useActionState(action, initialActionState);

  useEffect(() => {
    if (state.status === 'error' && state.message && !state.fieldErrors) toast.error(state.message);
  }, [state]);

  const setData = <K extends keyof ClaimFormData>(key: K, value: ClaimFormData[K]) =>
    setDataState((prev) => ({ ...prev, [key]: value }));

  return { mode, companyId, claim, clients, data, setData, formAction, pending, errors: state.fieldErrors ?? {} };
}

export type ClaimFormState = ReturnType<typeof useClaimForm>;
