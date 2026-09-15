'use client';

import type { ServiceOptionDto } from '@/modules/service/serializers/service.serializer';
import { AccountFormProvider } from '../contexts/AccountFormContext';
import { useAccountForm } from '../hooks/useAccountForm';
import { AccountForm } from './AccountForm';

type Props = { companyId: string; initialId: string; today: string; services: ServiceOptionDto[] };

/** Crear: instantiates the form hook and exposes it through the context. */
export function AccountCreate({ companyId, initialId, today, services }: Props) {
  const form = useAccountForm({ mode: 'create', companyId, initialId, today, services });

  return (
    <AccountFormProvider value={form}>
      <AccountForm />
    </AccountFormProvider>
  );
}
