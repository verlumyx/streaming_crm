'use client';

import { useActionState, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { initialActionState } from '@/modules/shared/actions/action-state';
import { addDays } from '@/lib/format';
import { createAccountAction, updateAccountAction } from '@/app/[companyId]/accounts/actions';
import type { AccountStatus, ProfileStatus } from '@/modules/account/models/account.model';
import type { AccountDto, ProfileDto } from '@/modules/account/serializers/account.serializer';
import type { ServiceOptionDto } from '@/modules/service/serializers/service.serializer';

export type AccountProfileFormRow = { number: number; pin: string; status: ProfileStatus; notes: string };

export type AccountFormData = {
  id: string;
  serviceId: string;
  email: string;
  password: string;
  cost: number;
  purchaseDate: string;
  nextRenewal: string;
  status: AccountStatus;
  notes: string;
  profiles: AccountProfileFormRow[];
};

type Options =
  | {
      mode: 'create';
      companyId: string;
      initialId: string;
      today: string;
      services: ServiceOptionDto[];
      account?: undefined;
      profiles?: undefined;
    }
  | {
      mode: 'edit';
      companyId: string;
      account: AccountDto;
      profiles: ProfileDto[];
      services: ServiceOptionDto[];
      initialId?: undefined;
      today?: undefined;
    };

/** N empty rows (1..max) in status available. */
function blankRows(max: number): AccountProfileFormRow[] {
  return Array.from({ length: Math.max(0, max) }, (_, i) => ({
    number: i + 1,
    pin: '',
    status: 'available' as const,
    notes: '',
  }));
}

export function useAccountForm(options: Options) {
  const { mode, companyId, services } = options;

  const [data, setDataState] = useState<AccountFormData>(() => {
    if (options.mode === 'edit') {
      const { account, profiles } = options;
      return {
        id: account.id,
        serviceId: account.serviceId,
        email: account.email,
        password: '',
        cost: account.cost,
        purchaseDate: account.purchaseDate,
        nextRenewal: account.nextRenewal,
        status: account.status,
        notes: account.notes ?? '',
        profiles: [...profiles]
          .sort((a, b) => a.number - b.number)
          .map((p) => ({ number: p.number, pin: p.pin ?? '', status: p.status, notes: p.notes ?? '' })),
      };
    }
    const firstService = services[0];
    return {
      id: options.initialId,
      serviceId: firstService?.id ?? '',
      email: '',
      password: '',
      cost: 0,
      purchaseDate: options.today,
      nextRenewal: addDays(options.today, 30),
      status: 'active',
      notes: '',
      profiles: blankRows(firstService?.maxProfiles ?? 0),
    };
  });

  // companyId / id are bound here — the action never reads them from FormData.
  const action =
    options.mode === 'create'
      ? createAccountAction.bind(null, companyId)
      : updateAccountAction.bind(null, companyId, options.account.id);

  const [state, formAction, pending] = useActionState(action, initialActionState);

  useEffect(() => {
    if (state.status === 'error' && state.message && !state.fieldErrors) toast.error(state.message);
  }, [state]);

  const setData = <K extends keyof AccountFormData>(key: K, value: AccountFormData[K]) =>
    setDataState((prev) => ({ ...prev, [key]: value }));

  /** Changing the service (create only) regenerates the profile rows from its `maxProfiles`. */
  const changeService = (serviceId: string) => {
    const max = services.find((s) => s.id === serviceId)?.maxProfiles ?? 0;
    setDataState((prev) => ({ ...prev, serviceId, profiles: blankRows(max) }));
  };

  const setProfile = <K extends keyof AccountProfileFormRow>(index: number, key: K, value: AccountProfileFormRow[K]) =>
    setDataState((prev) => ({
      ...prev,
      profiles: prev.profiles.map((row, i) => (i === index ? { ...row, [key]: value } : row)),
    }));

  /** Profile rows travel as one JSON hidden input (`profiles`). */
  const profilesPayload = useMemo(
    () =>
      JSON.stringify(
        data.profiles.map((row) =>
          mode === 'create'
            ? { number: row.number, pin: row.pin.trim() || null }
            : { number: row.number, pin: row.pin.trim() || null, status: row.status, notes: row.notes.trim() || null },
        ),
      ),
    [data.profiles, mode],
  );

  const selectedService = services.find((s) => s.id === data.serviceId);

  return {
    mode,
    data,
    setData,
    setProfile,
    changeService,
    profilesPayload,
    services,
    selectedService,
    formAction,
    pending,
    errors: state.fieldErrors ?? {},
    formError: state.status === 'error' ? (state.message ?? null) : null,
  };
}
