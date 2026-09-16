'use client';

import { useActionState, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { initialActionState, type ActionState } from '@/modules/shared/actions/action-state';
import { createSaleAction } from '@/app/[companyId]/sales/actions';
import { requiredProfileCount } from '@/modules/sale/domain/sale-rules';
import type {
  SaleAvailableProfileDto,
  SaleClientOptionDto,
  SalePlanOptionDto,
} from '@/modules/sale/serializers/sale.serializer';
import { unavailableProfilesOf, type SaleUnavailableProfile } from '../types/Sale';

export type SaleFormData = {
  id: string;
  clientId: string;
  planId: string;
  startDate: string;
  profileIds: string[];
  notes: string;
};

type Options = {
  companyId: string;
  initialId: string;
  today: string;
  clients: SaleClientOptionDto[];
  plans: SalePlanOptionDto[];
  availableProfiles: SaleAvailableProfileDto[];
  preselectedClientId: string | null;
};

const STEP_OF_FIELD: Record<string, number> = { clientId: 1, planId: 2, startDate: 2, profileIds: 3 };

/** State of the 3-step sale wizard (client → plan → profiles), bound to `createSaleAction`. */
export function useSaleForm(options: Options) {
  const { companyId, clients, plans, availableProfiles } = options;
  const router = useRouter();

  const [data, setDataState] = useState<SaleFormData>({
    id: options.initialId,
    clientId: options.preselectedClientId ?? '',
    planId: '',
    startDate: options.today,
    profileIds: [],
    notes: '',
  });
  const [step, setStep] = useState(1);
  const [selectedClient, setSelectedClient] = useState<SaleClientOptionDto | null>(
    () => clients.find((c) => c.id === options.preselectedClientId) ?? null,
  );
  const [unavailable, setUnavailable] = useState<SaleUnavailableProfile[]>([]);

  const [state, formAction, pending] = useActionState(createSaleAction.bind(null, companyId), initialActionState);

  // React to a new action result while rendering (no effect): conflict → re-pick, field error → jump to its step.
  const [handledState, setHandledState] = useState<ActionState>(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state.status === 'conflict') {
      const taken = unavailableProfilesOf(state.details);
      const takenIds = new Set(taken.map((p) => p.id));
      setUnavailable(taken);
      setDataState((prev) => ({ ...prev, profileIds: prev.profileIds.filter((id) => !takenIds.has(id)) }));
      setStep(3);
    } else if (state.status === 'error') {
      const firstField = Object.keys(state.fieldErrors ?? {}).find((field) => STEP_OF_FIELD[field]);
      if (firstField) setStep(STEP_OF_FIELD[firstField]);
    }
  }

  const selectedPlan = useMemo(() => plans.find((p) => p.id === data.planId) ?? null, [plans, data.planId]);
  const requiredCount = selectedPlan ? requiredProfileCount(selectedPlan.capacity, selectedPlan.maxProfiles) : 0;
  /** A `profile` plan accepts several profiles: the server registers one sale per profile. */
  const sellsOneSalePerProfile = selectedPlan?.capacity === 'profile';
  const saleCount = sellsOneSalePerProfile ? data.profileIds.length : data.profileIds.length > 0 ? 1 : 0;

  const serviceProfiles = useMemo(() => {
    if (!selectedPlan) return [];
    const takenIds = new Set(unavailable.map((p) => p.id));
    return availableProfiles.filter((p) => p.serviceId === selectedPlan.serviceId && !takenIds.has(p.id));
  }, [availableProfiles, selectedPlan, unavailable]);

  const setData = <K extends keyof SaleFormData>(key: K, value: SaleFormData[K]) =>
    setDataState((prev) => ({ ...prev, [key]: value }));

  const selectClient = (client: SaleClientOptionDto) => {
    setSelectedClient(client);
    setData('clientId', client.id);
  };

  /** Choosing a plan resets the profiles (they depend on its service and capacity). */
  const selectPlan = (planId: string) => setDataState((prev) => ({ ...prev, planId, profileIds: [] }));

  const toggleProfile = (profileId: string) =>
    setDataState((prev) => ({
      ...prev,
      profileIds: prev.profileIds.includes(profileId)
        ? prev.profileIds.filter((id) => id !== profileId)
        : [...prev.profileIds, profileId],
    }));

  const canContinue =
    step === 1
      ? data.clientId !== ''
      : step === 2
        ? data.planId !== '' && data.startDate !== ''
        : sellsOneSalePerProfile
          ? data.profileIds.length > 0
          : requiredCount > 0 && data.profileIds.length === requiredCount;

  const notifyConflict = () => {
    toast.error(state.message ?? 'Algunos perfiles ya no están disponibles.');
    router.refresh();
  };

  return {
    companyId,
    clients,
    plans,
    data,
    setData,
    step,
    setStep,
    selectedClient,
    selectClient,
    selectedPlan,
    selectPlan,
    requiredCount,
    sellsOneSalePerProfile,
    saleCount,
    serviceProfiles,
    toggleProfile,
    unavailable,
    canContinue,
    state,
    formAction,
    pending,
    notifyConflict,
    errors: state.fieldErrors ?? {},
  };
}

export type SaleFormState = ReturnType<typeof useSaleForm>;
