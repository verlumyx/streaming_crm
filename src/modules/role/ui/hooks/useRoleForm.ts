'use client';

import { useActionState, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { initialActionState } from '@/modules/shared/actions/action-state';
import { createRoleAction, updateRoleAction } from '@/app/[companyId]/roles/actions';
import type { PermissionType } from '@/modules/role/models/role.model';
import type { RoleDto } from '@/modules/role/serializers/role.serializer';
import type { PermissionTreeModuleDto } from '../types/Role';

export type RoleFormData = {
  id: string;
  name: string;
  description: string;
  permissionType: PermissionType;
  /** Selected permission action strings (`users.list`). */
  permissions: string[];
};

type Options =
  | { mode: 'create'; companyId: string; initialId: string; modules: PermissionTreeModuleDto[]; role?: undefined }
  | { mode: 'edit'; companyId: string; role: RoleDto; modules: PermissionTreeModuleDto[]; initialId?: undefined };

export function useRoleForm(options: Options) {
  const { mode, companyId, role, modules } = options;

  const [data, setDataState] = useState<RoleFormData>(() => ({
    id: role?.id ?? options.initialId ?? '',
    name: role?.name ?? '',
    description: role?.description ?? '',
    permissionType: role?.permissionType ?? 'custom',
    permissions: role?.permissions ?? [],
  }));

  // companyId / id are bound here — the action never reads them from FormData.
  const action =
    mode === 'create' ? createRoleAction.bind(null, companyId) : updateRoleAction.bind(null, companyId, role.id);

  const [state, formAction, pending] = useActionState(action, initialActionState);

  useEffect(() => {
    if (state.status === 'error' && state.message) toast.error(state.message);
  }, [state]);

  const setData = <K extends keyof RoleFormData>(key: K, value: RoleFormData[K]) =>
    setDataState((prev) => ({ ...prev, [key]: value }));

  /** `Administrador` is read-only: the form renders but cannot be submitted. */
  const isLocked = mode === 'edit' && role.isAdministrator;

  return { mode, data, setData, modules, formAction, pending, isLocked, errors: state.fieldErrors ?? {} };
}
