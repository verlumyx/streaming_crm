'use client';

import type { RoleDto } from '@/modules/role/serializers/role.serializer';
import { RoleFormProvider } from '../contexts/RoleFormContext';
import { useRoleForm } from '../hooks/useRoleForm';
import type { PermissionTreeModuleDto } from '../types/Role';
import { RoleForm } from './RoleForm';

type Props = { companyId: string; role: RoleDto; modules: PermissionTreeModuleDto[] };

/** Editar: same form bound to `updateRoleAction`. */
export function RoleEdit({ companyId, role, modules }: Props) {
  const form = useRoleForm({ mode: 'edit', companyId, role, modules });

  return (
    <RoleFormProvider value={form}>
      <RoleForm />
    </RoleFormProvider>
  );
}
