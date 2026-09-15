'use client';

import { useActionState, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { initialActionState } from '@/modules/shared/actions/action-state';
import { DEFAULT_DIAL } from '@/lib/phone';
import { createLeadAction } from '@/app/contact/actions';

export type LeadFormData = {
  name: string;
  email: string;
  phonePrefix: string;
  phone: string;
};

export function useLeadForm() {
  const [data, setDataState] = useState<LeadFormData>({
    name: '',
    email: '',
    phonePrefix: DEFAULT_DIAL,
    phone: '',
  });
  const [state, formAction, pending] = useActionState(createLeadAction, initialActionState);

  useEffect(() => {
    if (state.status === 'error' && state.message && !state.fieldErrors) toast.error(state.message);
  }, [state]);

  const setData = <K extends keyof LeadFormData>(key: K, value: LeadFormData[K]) =>
    setDataState((prev) => ({ ...prev, [key]: value }));

  return { data, setData, formAction, pending, errors: state.fieldErrors ?? {} };
}
