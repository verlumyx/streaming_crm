'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/db/client';
import { requirePermission } from '@/modules/shared/auth/require-permission';
import { toActionError, toFieldErrors, type ActionState } from '@/modules/shared/actions/action-state';
import { setFlash } from '@/modules/shared/flash/flash';
import { isUuid } from '@/modules/shared/uuid';
import { ROLE_PERMISSIONS } from '@/modules/role/permissions';
import { createRoleContainer } from '@/modules/role/container';
import { roleRoutes } from '@/modules/role/routes';
import { createRoleSchema } from '@/modules/role/validation/create-role.schema';
import { updateRoleSchema } from '@/modules/role/validation/update-role.schema';
import { updateStatusRoleSchema } from '@/modules/role/validation/update-status-role.schema';
import { CreateRoleCommand } from '@/modules/role/commands/create-role.command';
import { UpdateRoleCommand } from '@/modules/role/commands/update-role.command';
import { UpdateStatusRoleCommand } from '@/modules/role/commands/update-status-role.command';

const NOT_FOUND: ActionState = { status: 'error', message: 'Rol no encontrado.' };

/** Crear → redirects to the list. Role + permissions are written in one transaction. */
export async function createRoleAction(
  companyId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requirePermission(companyId, ROLE_PERMISSIONS.CREATE);

    const parsed = createRoleSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return toFieldErrors(z.flattenError(parsed.error).fieldErrors);

    await db.transaction(async (tx) => {
      await createRoleContainer(tx).createService.execute(CreateRoleCommand.fromInput(parsed.data, companyId));
    });
  } catch (error) {
    return toActionError(error);
  }

  revalidatePath(roleRoutes.index(companyId));
  await setFlash('success', 'Rol creado correctamente.');
  redirect(roleRoutes.index(companyId));
}

/** Actualizar → redirects to the detail page. Replaces the permission set in the same transaction. */
export async function updateRoleAction(
  companyId: string,
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requirePermission(companyId, ROLE_PERMISSIONS.UPDATE);
    if (!isUuid(id)) return NOT_FOUND;

    const parsed = updateRoleSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return toFieldErrors(z.flattenError(parsed.error).fieldErrors);

    await db.transaction(async (tx) => {
      await createRoleContainer(tx).updateService.execute(id, companyId, UpdateRoleCommand.fromInput(parsed.data));
    });
  } catch (error) {
    return toActionError(error);
  }

  revalidatePath(roleRoutes.index(companyId));
  revalidatePath(roleRoutes.show(companyId, id));
  await setFlash('success', 'Rol actualizado correctamente.');
  redirect(roleRoutes.show(companyId, id));
}

/**
 * Actualizar Estado. Single atomic update, no transaction.
 * `from` decides where to land: the list (default) or back on the detail page.
 */
export async function updateRoleStatusAction(
  companyId: string,
  id: string,
  status: string,
  from: 'list' | 'show' = 'list',
): Promise<ActionState> {
  try {
    await requirePermission(companyId, ROLE_PERMISSIONS.UPDATE_STATUS);
    if (!isUuid(id)) return NOT_FOUND;

    const parsed = updateStatusRoleSchema.safeParse({ status });
    if (!parsed.success) return toFieldErrors(z.flattenError(parsed.error).fieldErrors);

    await createRoleContainer(db).updateStatusService.execute(id, companyId, UpdateStatusRoleCommand.fromInput(parsed.data));
  } catch (error) {
    return toActionError(error);
  }

  revalidatePath(roleRoutes.index(companyId));
  revalidatePath(roleRoutes.show(companyId, id));
  await setFlash('success', 'Estado del rol actualizado correctamente.');
  redirect(from === 'show' ? roleRoutes.show(companyId, id) : roleRoutes.index(companyId));
}
