'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/db/client';
import { requirePermission } from '@/modules/shared/auth/require-permission';
import { getSessionUser } from '@/modules/shared/auth/session';
import { toActionError, toFieldErrors, type ActionState } from '@/modules/shared/actions/action-state';
import { setFlash } from '@/modules/shared/flash/flash';
import { isUuid } from '@/modules/shared/uuid';
import { CLIENT_PERMISSIONS } from '@/modules/client/permissions';
import { createClientContainer } from '@/modules/client/container';
import { clientRoutes } from '@/modules/client/routes';
import { createClientSchema } from '@/modules/client/validation/create-client.schema';
import { updateClientSchema } from '@/modules/client/validation/update-client.schema';
import { updateStatusClientSchema } from '@/modules/client/validation/update-status-client.schema';
import { CreateClientCommand } from '@/modules/client/commands/create-client.command';
import { UpdateClientCommand } from '@/modules/client/commands/update-client.command';
import { UpdateStatusClientCommand } from '@/modules/client/commands/update-status-client.command';

const NOT_FOUND: ActionState = { status: 'error', message: 'Cliente no encontrado.' };

/** Crear → redirects to the list. */
export async function createClientAction(
  companyId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requirePermission(companyId, CLIENT_PERMISSIONS.CREATE);

    const parsed = createClientSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return toFieldErrors(z.flattenError(parsed.error).fieldErrors);

    const user = await getSessionUser();
    await db.transaction(async (tx) => {
      await createClientContainer(tx).createService.execute(
        CreateClientCommand.fromInput(parsed.data, companyId, user?.id ?? null),
      );
    });
  } catch (error) {
    return toActionError(error);
  }

  revalidatePath(clientRoutes.index(companyId));
  await setFlash('success', 'Cliente creado correctamente.');
  redirect(clientRoutes.index(companyId));
}

/** Actualizar → redirects to the detail page. */
export async function updateClientAction(
  companyId: string,
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requirePermission(companyId, CLIENT_PERMISSIONS.UPDATE);
    if (!isUuid(id)) return NOT_FOUND;

    const parsed = updateClientSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return toFieldErrors(z.flattenError(parsed.error).fieldErrors);

    await db.transaction(async (tx) => {
      await createClientContainer(tx).updateService.execute(id, companyId, UpdateClientCommand.fromInput(parsed.data));
    });
  } catch (error) {
    return toActionError(error);
  }

  revalidatePath(clientRoutes.index(companyId));
  revalidatePath(clientRoutes.show(companyId, id));
  await setFlash('success', 'Cliente actualizado correctamente.');
  redirect(clientRoutes.show(companyId, id));
}

/**
 * Actualizar Estado. Single atomic update, no transaction.
 * `from` decides where to land: the list (default) or back on the detail page.
 */
export async function updateClientStatusAction(
  companyId: string,
  id: string,
  status: string,
  from: 'list' | 'show' = 'list',
): Promise<ActionState> {
  try {
    await requirePermission(companyId, CLIENT_PERMISSIONS.UPDATE_STATUS);
    if (!isUuid(id)) return NOT_FOUND;

    const parsed = updateStatusClientSchema.safeParse({ status });
    if (!parsed.success) return toFieldErrors(z.flattenError(parsed.error).fieldErrors);

    await createClientContainer(db).updateStatusService.execute(
      id,
      companyId,
      UpdateStatusClientCommand.fromInput(parsed.data),
    );
  } catch (error) {
    return toActionError(error);
  }

  revalidatePath(clientRoutes.index(companyId));
  revalidatePath(clientRoutes.show(companyId, id));
  await setFlash('success', 'Estado del cliente actualizado correctamente.');
  redirect(from === 'show' ? clientRoutes.show(companyId, id) : clientRoutes.index(companyId));
}
