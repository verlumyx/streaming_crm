'use client';

import type { RoleOptionDto } from '@/modules/role/serializers/role.serializer';
import type { UserDto } from '@/modules/user/serializers/user.serializer';
import { UserFormProvider } from '../contexts/UserFormContext';
import { useUserForm } from '../hooks/useUserForm';
import { UserForm } from './UserForm';

type Props = { companyId: string; user: UserDto; roles: RoleOptionDto[] };

/** Editar: same form bound to `updateUserAction`. */
export function UserEdit({ companyId, user, roles }: Props) {
  const form = useUserForm({ mode: 'edit', companyId, user, roles });

  return (
    <UserFormProvider value={form}>
      <UserForm />
    </UserFormProvider>
  );
}
