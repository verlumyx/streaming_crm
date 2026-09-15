'use client';

import type { AccountDto, ProfileDto } from '@/modules/account/serializers/account.serializer';
import type { ServiceOptionDto } from '@/modules/service/serializers/service.serializer';
import { AccountFormProvider } from '../contexts/AccountFormContext';
import { useAccountForm } from '../hooks/useAccountForm';
import { AccountForm } from './AccountForm';

type Props = { companyId: string; account: AccountDto; profiles: ProfileDto[]; services: ServiceOptionDto[] };

/** Editar: same form bound to `updateAccountAction`. */
export function AccountEdit({ companyId, account, profiles, services }: Props) {
  const form = useAccountForm({ mode: 'edit', companyId, account, profiles, services });

  return (
    <AccountFormProvider value={form}>
      <AccountForm />
    </AccountFormProvider>
  );
}
