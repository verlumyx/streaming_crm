'use client';

import { RoleFormProvider } from '../contexts/RoleFormContext';
import { useRoleForm } from '../hooks/useRoleForm';
import type { PermissionTreeModuleDto } from '../types/Role';
import { RoleForm } from './RoleForm';

type Props = { companyId: string; initialId: string; modules: PermissionTreeModuleDto[] };

/** Crear: instantiates the form hook and exposes it through the context. */
export function RoleCreate({ companyId, initialId, modules }: Props) {
  const form = useRoleForm({ mode: 'create', companyId, initialId, modules });

  return (
    <RoleFormProvider value={form}>
      <RoleForm />
    </RoleFormProvider>
  );
}
