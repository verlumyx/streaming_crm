'use client';

import { useActionState, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { initialActionState } from '@/modules/shared/actions/action-state';
import { createPlanAction, updatePlanAction } from '@/app/[companyId]/plans/actions';
import type { PlanCapacity } from '@/modules/plan/models/plan.model';
import type { PlanDto } from '@/modules/plan/serializers/plan.serializer';
import type { ServiceOptionDto } from '@/modules/service/serializers/service.serializer';

export type PlanFormData = {
  id: string;
  serviceId: string;
  name: string;
  capacity: PlanCapacity;
  durationDays: number;
  salePrice: number;
  roiTargetPct: number;
};

type Options =
  | { mode: 'create'; companyId: string; services: ServiceOptionDto[]; initialId: string; plan?: undefined }
  | { mode: 'edit'; companyId: string; services: ServiceOptionDto[]; plan: PlanDto; initialId?: undefined };

export function usePlanForm(options: Options) {
  const { mode, companyId, services, plan } = options;

  const [data, setDataState] = useState<PlanFormData>(() => ({
    id: plan?.id ?? options.initialId ?? '',
    serviceId: plan?.serviceId ?? services[0]?.id ?? '',
    name: plan?.name ?? '',
    capacity: plan?.capacity ?? 'profile',
    durationDays: plan?.durationDays ?? 30,
    salePrice: plan?.salePrice ?? 0,
    roiTargetPct: plan?.roiTargetPct ?? 0,
  }));

  // companyId / id are bound here — the action never reads them from FormData.
  const action =
    mode === 'create' ? createPlanAction.bind(null, companyId) : updatePlanAction.bind(null, companyId, plan.id);

  const [state, formAction, pending] = useActionState(action, initialActionState);

  useEffect(() => {
    if (state.status === 'error' && state.message && !state.fieldErrors) toast.error(state.message);
  }, [state]);

  const setData = <K extends keyof PlanFormData>(key: K, value: PlanFormData[K]) =>
    setDataState((prev) => ({ ...prev, [key]: value }));

  return { mode, services, data, setData, formAction, pending, errors: state.fieldErrors ?? {} };
}
