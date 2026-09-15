'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/db/client';
import { requirePermission } from '@/modules/shared/auth/require-permission';
import { toActionError, toFieldErrors, type ActionState } from '@/modules/shared/actions/action-state';
import { setFlash } from '@/modules/shared/flash/flash';
import { isUuid } from '@/modules/shared/uuid';
import { SERVICE_PERMISSIONS } from '@/modules/service/permissions';
import { createServiceContainer } from '@/modules/service/container';
import { serviceRoutes } from '@/modules/service/routes';
import { createServiceSchema } from '@/modules/service/validation/create-service.schema';
import { updateServiceSchema } from '@/modules/service/validation/update-service.schema';
import { updateStatusServiceSchema } from '@/modules/service/validation/update-status-service.schema';
import { CreateServiceCommand } from '@/modules/service/commands/create-service.command';
import { UpdateServiceCommand } from '@/modules/service/commands/update-service.command';
import { UpdateStatusServiceCommand } from '@/modules/service/commands/update-status-service.command';

const NOT_FOUND: ActionState = { status: 'error', message: 'Servicio no encontrado.' };

/** Crear → redirects to the list. */
export async function createServiceAction(
  companyId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requirePermission(companyId, SERVICE_PERMISSIONS.CREATE);

    const parsed = createServiceSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return toFieldErrors(z.flattenError(parsed.error).fieldErrors);

    await db.transaction(async (tx) => {
      await createServiceContainer(tx).createService.execute(CreateServiceCommand.fromInput(parsed.data, companyId));
    });
  } catch (error) {
    return toActionError(error);
  }

  revalidatePath(serviceRoutes.index(companyId));
  await setFlash('success', 'Servicio creado correctamente.');
  redirect(serviceRoutes.index(companyId));
}

/** Actualizar → redirects to the detail page. */
export async function updateServiceAction(
  companyId: string,
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requirePermission(companyId, SERVICE_PERMISSIONS.UPDATE);
    if (!isUuid(id)) return NOT_FOUND;

    const parsed = updateServiceSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return toFieldErrors(z.flattenError(parsed.error).fieldErrors);

    await db.transaction(async (tx) => {
      await createServiceContainer(tx).updateService.execute(id, companyId, UpdateServiceCommand.fromInput(parsed.data));
    });
  } catch (error) {
    return toActionError(error);
  }

  revalidatePath(serviceRoutes.index(companyId));
  revalidatePath(serviceRoutes.show(companyId, id));
  await setFlash('success', 'Servicio actualizado correctamente.');
  redirect(serviceRoutes.show(companyId, id));
}

/**
 * Actualizar Estado (`active` flag). Single atomic update, no transaction.
 * `from` decides where to land: the list (default) or back on the detail page.
 */
export async function updateServiceStatusAction(
  companyId: string,
  id: string,
  active: boolean | string,
  from: 'list' | 'show' = 'list',
): Promise<ActionState> {
  try {
    await requirePermission(companyId, SERVICE_PERMISSIONS.UPDATE_STATUS);
    if (!isUuid(id)) return NOT_FOUND;

    const parsed = updateStatusServiceSchema.safeParse({ active });
    if (!parsed.success) return toFieldErrors(z.flattenError(parsed.error).fieldErrors);

    await createServiceContainer(db).updateStatusService.execute(
      id,
      companyId,
      UpdateStatusServiceCommand.fromInput(parsed.data),
    );
  } catch (error) {
    return toActionError(error);
  }

  revalidatePath(serviceRoutes.index(companyId));
  revalidatePath(serviceRoutes.show(companyId, id));
  await setFlash('success', 'Estado del servicio actualizado correctamente.');
  redirect(from === 'show' ? serviceRoutes.show(companyId, id) : serviceRoutes.index(companyId));
}
