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
import { CLAIM_PERMISSIONS } from '@/modules/claim/permissions';
import { createClaimContainer } from '@/modules/claim/container';
import { claimRoutes } from '@/modules/claim/routes';
import { createClaimSchema } from '@/modules/claim/validation/create-claim.schema';
import { updateClaimSchema } from '@/modules/claim/validation/update-claim.schema';
import { updateStatusClaimSchema } from '@/modules/claim/validation/update-status-claim.schema';
import { CreateClaimCommand } from '@/modules/claim/commands/create-claim.command';
import { UpdateClaimCommand } from '@/modules/claim/commands/update-claim.command';
import { UpdateStatusClaimCommand } from '@/modules/claim/commands/update-status-claim.command';

const NOT_FOUND: ActionState = { status: 'error', message: 'Reclamo no encontrado.' };

/** Crear → redirige al detalle. */
export async function createClaimAction(
  companyId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let id: string;
  try {
    await requirePermission(companyId, CLAIM_PERMISSIONS.CREATE);

    const parsed = createClaimSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return toFieldErrors(z.flattenError(parsed.error).fieldErrors);

    const user = await getSessionUser();
    id = parsed.data.id;
    await db.transaction(async (tx) => {
      await createClaimContainer(tx).createService.execute(
        CreateClaimCommand.fromInput(parsed.data, companyId, user?.id ?? null),
      );
    });
  } catch (error) {
    return toActionError(error);
  }

  revalidatePath(claimRoutes.index(companyId));
  await setFlash('success', 'Reclamo registrado correctamente.');
  redirect(claimRoutes.show(companyId, id));
}

/** Actualizar → redirige al detalle. Sólo mientras el reclamo no esté cerrado. */
export async function updateClaimAction(
  companyId: string,
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requirePermission(companyId, CLAIM_PERMISSIONS.UPDATE);
    if (!isUuid(id)) return NOT_FOUND;

    const parsed = updateClaimSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return toFieldErrors(z.flattenError(parsed.error).fieldErrors);

    await db.transaction(async (tx) => {
      await createClaimContainer(tx).updateService.execute(id, companyId, UpdateClaimCommand.fromInput(parsed.data));
    });
  } catch (error) {
    return toActionError(error);
  }

  revalidatePath(claimRoutes.index(companyId));
  revalidatePath(claimRoutes.show(companyId, id));
  await setFlash('success', 'Reclamo actualizado correctamente.');
  redirect(claimRoutes.show(companyId, id));
}

/**
 * Actualizar Estado. `from` decide dónde aterriza: el listado (acciones rápidas) o el detalle.
 * `resolutionNotes` sólo se guarda si el formulario lo envía, así el listado no borra las notas.
 */
export async function updateStatusClaimAction(
  companyId: string,
  id: string,
  from: 'list' | 'show',
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requirePermission(companyId, CLAIM_PERMISSIONS.UPDATE_STATUS);
    if (!isUuid(id)) return NOT_FOUND;

    const parsed = updateStatusClaimSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return toFieldErrors(z.flattenError(parsed.error).fieldErrors);

    const user = await getSessionUser();
    await db.transaction(async (tx) => {
      await createClaimContainer(tx).updateStatusService.execute(
        id,
        companyId,
        UpdateStatusClaimCommand.fromInput(parsed.data, user?.id ?? null),
      );
    });
  } catch (error) {
    return toActionError(error);
  }

  revalidatePath(claimRoutes.index(companyId));
  revalidatePath(claimRoutes.show(companyId, id));
  await setFlash('success', 'Estado del reclamo actualizado correctamente.');
  redirect(from === 'show' ? claimRoutes.show(companyId, id) : claimRoutes.index(companyId));
}
