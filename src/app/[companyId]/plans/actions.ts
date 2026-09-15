'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/db/client';
import { requirePermission } from '@/modules/shared/auth/require-permission';
import { toActionError, toFieldErrors, type ActionState } from '@/modules/shared/actions/action-state';
import { setFlash } from '@/modules/shared/flash/flash';
import { isUuid } from '@/modules/shared/uuid';
import { PLAN_PERMISSIONS } from '@/modules/plan/permissions';
import { createPlanContainer } from '@/modules/plan/container';
import { planRoutes } from '@/modules/plan/routes';
import { createPlanSchema } from '@/modules/plan/validation/create-plan.schema';
import { updatePlanSchema } from '@/modules/plan/validation/update-plan.schema';
import { updateStatusPlanSchema } from '@/modules/plan/validation/update-status-plan.schema';
import { CreatePlanCommand } from '@/modules/plan/commands/create-plan.command';
import { UpdatePlanCommand } from '@/modules/plan/commands/update-plan.command';
import { UpdateStatusPlanCommand } from '@/modules/plan/commands/update-status-plan.command';

const NOT_FOUND: ActionState = { status: 'error', message: 'Plan no encontrado.' };

/** Crear → redirects to the list. */
export async function createPlanAction(
  companyId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requirePermission(companyId, PLAN_PERMISSIONS.CREATE);

    const parsed = createPlanSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return toFieldErrors(z.flattenError(parsed.error).fieldErrors);

    await db.transaction(async (tx) => {
      await createPlanContainer(tx).createService.execute(CreatePlanCommand.fromInput(parsed.data, companyId));
    });
  } catch (error) {
    return toActionError(error);
  }

  revalidatePath(planRoutes.index(companyId));
  await setFlash('success', 'Plan creado correctamente.');
  redirect(planRoutes.index(companyId));
}

/** Actualizar → redirects to the detail page. */
export async function updatePlanAction(
  companyId: string,
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requirePermission(companyId, PLAN_PERMISSIONS.UPDATE);
    if (!isUuid(id)) return NOT_FOUND;

    const parsed = updatePlanSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return toFieldErrors(z.flattenError(parsed.error).fieldErrors);

    await db.transaction(async (tx) => {
      await createPlanContainer(tx).updateService.execute(id, companyId, UpdatePlanCommand.fromInput(parsed.data));
    });
  } catch (error) {
    return toActionError(error);
  }

  revalidatePath(planRoutes.index(companyId));
  revalidatePath(planRoutes.show(companyId, id));
  await setFlash('success', 'Plan actualizado correctamente.');
  redirect(planRoutes.show(companyId, id));
}

/**
 * Actualizar Estado (`active` flag). Single atomic update, no transaction.
 * `from` decides where to land: the list (default) or back on the detail page.
 */
export async function updatePlanStatusAction(
  companyId: string,
  id: string,
  active: boolean | string,
  from: 'list' | 'show' = 'list',
): Promise<ActionState> {
  try {
    await requirePermission(companyId, PLAN_PERMISSIONS.UPDATE_STATUS);
    if (!isUuid(id)) return NOT_FOUND;

    const parsed = updateStatusPlanSchema.safeParse({ active });
    if (!parsed.success) return toFieldErrors(z.flattenError(parsed.error).fieldErrors);

    await createPlanContainer(db).updateStatusService.execute(id, companyId, UpdateStatusPlanCommand.fromInput(parsed.data));
  } catch (error) {
    return toActionError(error);
  }

  revalidatePath(planRoutes.index(companyId));
  revalidatePath(planRoutes.show(companyId, id));
  await setFlash('success', 'Estado del plan actualizado correctamente.');
  redirect(from === 'show' ? planRoutes.show(companyId, id) : planRoutes.index(companyId));
}
