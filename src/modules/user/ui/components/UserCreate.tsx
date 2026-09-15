'use client';

import type { RoleOptionDto } from '@/modules/role/serializers/role.serializer';
import { UserFormProvider } from '../contexts/UserFormContext';
import { useUserForm } from '../hooks/useUserForm';
import { UserForm } from './UserForm';

type Props = { companyId: string; initialId: string; roles: RoleOptionDto[] };

/** Crear: instantiates the form hook (2-step invite flow) and exposes it through the context. */
export function UserCreate({ companyId, initialId, roles }: Props) {
  const form = useUserForm({ mode: 'create', companyId, initialId, roles });

  return (
    <UserFormProvider value={form}>
      <UserForm />
    </UserFormProvider>
  );
}
