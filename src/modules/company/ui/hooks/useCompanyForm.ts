'use client';

import { useActionState, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { initialActionState } from '@/modules/shared/actions/action-state';
import { createCompanyAction, updateCompanyAction } from '@/app/[companyId]/companies/actions';
import type { CompanyDto } from '@/modules/company/serializers/company.serializer';

export type CompanyFormData = {
  id: string;
  name: string;
  description: string;
};

type Options =
  | { mode: 'create'; companyId: string; initialId: string; company?: undefined }
  | { mode: 'edit'; companyId: string; company: CompanyDto; initialId?: undefined };

export function useCompanyForm(options: Options) {
  const { mode, companyId, company } = options;

  const [data, setDataState] = useState<CompanyFormData>(() => ({
    id: company?.id ?? options.initialId ?? '',
    name: company?.name ?? '',
    description: company?.description ?? '',
  }));

  // companyId / id are bound here — the action never reads them from FormData.
  const action =
    mode === 'create'
      ? createCompanyAction.bind(null, companyId)
      : updateCompanyAction.bind(null, companyId, company.id);

  const [state, formAction, pending] = useActionState(action, initialActionState);

  useEffect(() => {
    if (state.status === 'error' && state.message && !state.fieldErrors) toast.error(state.message);
  }, [state]);

  const setData = <K extends keyof CompanyFormData>(key: K, value: CompanyFormData[K]) =>
    setDataState((prev) => ({ ...prev, [key]: value }));

  return { mode, data, setData, formAction, pending, errors: state.fieldErrors ?? {} };
}
