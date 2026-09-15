'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/db/client';
import { requirePermission } from '@/modules/shared/auth/require-permission';
import { toActionError, toFieldErrors, type ActionState } from '@/modules/shared/actions/action-state';
import { setFlash } from '@/modules/shared/flash/flash';
import { isUuid } from '@/modules/shared/uuid';
import { USER_PERMISSIONS } from '@/modules/user/permissions';
import { createUserContainer } from '@/modules/user/container';
import { userRoutes } from '@/modules/user/routes';
import { checkUserEmailSchema } from '@/modules/user/validation/check-user-email.schema';
import { createUserSchema } from '@/modules/user/validation/create-user.schema';
import { updateUserSchema } from '@/modules/user/validation/update-user.schema';
import { updateStatusUserSchema } from '@/modules/user/validation/update-status-user.schema';
import { CreateUserCommand } from '@/modules/user/commands/create-user.command';
import { UpdateUserCommand } from '@/modules/user/commands/update-user.command';
import { UpdateStatusUserCommand } from '@/modules/user/commands/update-status-user.command';
import { toUserEmailCheckDto, type UserEmailCheckDto } from '@/modules/user/serializers/user.serializer';

const NOT_FOUND: ActionState = { status: 'error', message: 'Usuario no encontrado.' };

export type CheckUserEmailState = ActionState | ({ status: 'ok' } & UserEmailCheckDto);

/**
 * Step 1 of Crear (replaces the original `users.check-email` JSON endpoint): read-only lookup guarded by
 * `users.create`. Returns whether a global user exists and whether it already belongs to the company.
 */
export async function checkUserEmailAction(companyId: string, email: string): Promise<CheckUserEmailState> {
  try {
    await requirePermission(companyId, USER_PERMISSIONS.CREATE);

    const parsed = checkUserEmailSchema.safeParse({ email });
    if (!parsed.success) return toFieldErrors(z.flattenError(parsed.error).fieldErrors);

    const check = await createUserContainer(db).checkEmailService.execute(parsed.data.email, companyId);
    return { status: 'ok', ...toUserEmailCheckDto(check) };
  } catch (error) {
    return toActionError(error);
  }
}

/** Crear → redirects to the list. User + credential account + membership in one transaction. */
export async function createUserAction(
  companyId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requirePermission(companyId, USER_PERMISSIONS.CREATE);

    const parsed = createUserSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return toFieldErrors(z.flattenError(parsed.error).fieldErrors);

    await db.transaction(async (tx) => {
      await createUserContainer(tx).createService.execute(CreateUserCommand.fromInput(parsed.data, companyId));
    });
  } catch (error) {
    return toActionError(error);
  }

  revalidatePath(userRoutes.index(companyId));
  await setFlash('success', 'Usuario creado correctamente.');
  redirect(userRoutes.index(companyId));
}

/** Actualizar → redirects to the detail page. */
export async function updateUserAction(
  companyId: string,
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requirePermission(companyId, USER_PERMISSIONS.UPDATE);
    if (!isUuid(id)) return NOT_FOUND;

    const parsed = updateUserSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return toFieldErrors(z.flattenError(parsed.error).fieldErrors);

    await db.transaction(async (tx) => {
      await createUserContainer(tx).updateService.execute(id, companyId, UpdateUserCommand.fromInput(parsed.data));
    });
  } catch (error) {
    return toActionError(error);
  }

  revalidatePath(userRoutes.index(companyId));
  revalidatePath(userRoutes.show(companyId, id));
  await setFlash('success', 'Usuario actualizado correctamente.');
  redirect(userRoutes.show(companyId, id));
}

/**
 * Actualizar Estado of the membership in this company. Single atomic update, no transaction.
 * `from` decides where to land: the list (default) or back on the detail page.
 */
export async function updateUserStatusAction(
  companyId: string,
  id: string,
  status: string,
  from: 'list' | 'show' = 'list',
): Promise<ActionState> {
  try {
    await requirePermission(companyId, USER_PERMISSIONS.UPDATE_STATUS);
    if (!isUuid(id)) return NOT_FOUND;

    const parsed = updateStatusUserSchema.safeParse({ status });
    if (!parsed.success) return toFieldErrors(z.flattenError(parsed.error).fieldErrors);

    await createUserContainer(db).updateStatusService.execute(id, companyId, UpdateStatusUserCommand.fromInput(parsed.data));
  } catch (error) {
    return toActionError(error);
  }

  revalidatePath(userRoutes.index(companyId));
  revalidatePath(userRoutes.show(companyId, id));
  await setFlash('success', 'Estado del usuario actualizado correctamente.');
  redirect(from === 'show' ? userRoutes.show(companyId, id) : userRoutes.index(companyId));
}
