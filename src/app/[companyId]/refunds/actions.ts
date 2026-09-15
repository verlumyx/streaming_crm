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
import { saleRoutes } from '@/modules/sale/routes';
import { REFUND_PERMISSIONS } from '@/modules/refund/permissions';
import { createRefundContainer } from '@/modules/refund/container';
import { refundRoutes } from '@/modules/refund/routes';
import { createRefundSchema } from '@/modules/refund/validation/create-refund.schema';
import { updateRefundSchema } from '@/modules/refund/validation/update-refund.schema';
import { CreateRefundCommand } from '@/modules/refund/commands/create-refund.command';
import { UpdateRefundCommand } from '@/modules/refund/commands/update-refund.command';
import { ResolveRefundCommand } from '@/modules/refund/commands/resolve-refund.command';

const NOT_FOUND: ActionState = { status: 'error', message: 'Reembolso no encontrado.' };

/** Crear → redirects to the detail page. */
export async function createRefundAction(
  companyId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let id: string;
  try {
    await requirePermission(companyId, REFUND_PERMISSIONS.CREATE);

    const parsed = createRefundSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return toFieldErrors(z.flattenError(parsed.error).fieldErrors);

    const user = await getSessionUser();
    id = parsed.data.id;
    await db.transaction(async (tx) => {
      await createRefundContainer(tx).createService.execute(
        CreateRefundCommand.fromInput(parsed.data, companyId, user?.id ?? null),
      );
    });
  } catch (error) {
    return toActionError(error);
  }

  revalidatePath(refundRoutes.index(companyId));
  await setFlash('success', 'Reembolso registrado correctamente.');
  redirect(refundRoutes.show(companyId, id));
}

/** Actualizar (inline on the detail page) → redirects to the detail page. Only while pending. */
export async function updateRefundAction(
  companyId: string,
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requirePermission(companyId, REFUND_PERMISSIONS.UPDATE);
    if (!isUuid(id)) return NOT_FOUND;

    const parsed = updateRefundSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return toFieldErrors(z.flattenError(parsed.error).fieldErrors);

    await db.transaction(async (tx) => {
      await createRefundContainer(tx).updateService.execute(id, companyId, UpdateRefundCommand.fromInput(parsed.data));
    });
  } catch (error) {
    return toActionError(error);
  }

  revalidatePath(refundRoutes.index(companyId));
  revalidatePath(refundRoutes.show(companyId, id));
  await setFlash('success', 'Reembolso actualizado correctamente.');
  redirect(refundRoutes.show(companyId, id));
}

/** Aprobar: cancels the sale if still active and records the ledger expense, all in one transaction. */
export async function approveRefundAction(companyId: string, id: string): Promise<ActionState> {
  let saleId: string | null = null;
  try {
    await requirePermission(companyId, REFUND_PERMISSIONS.APPROVE);
    if (!isUuid(id)) return NOT_FOUND;

    const user = await getSessionUser();
    await db.transaction(async (tx) => {
      const container = createRefundContainer(tx);
      await container.approveService.execute(new ResolveRefundCommand(id, companyId, user?.id ?? null));
      saleId = (await container.repository.findOrFail(id, companyId)).saleId;
    });
  } catch (error) {
    return toActionError(error);
  }

  revalidatePath(refundRoutes.index(companyId));
  revalidatePath(refundRoutes.show(companyId, id));
  if (saleId) revalidatePath(saleRoutes.show(companyId, saleId));
  await setFlash('success', 'Reembolso aprobado correctamente.');
  redirect(refundRoutes.show(companyId, id));
}

/** Rechazar: no ledger entry and the sale is untouched. */
export async function rejectRefundAction(companyId: string, id: string): Promise<ActionState> {
  try {
    await requirePermission(companyId, REFUND_PERMISSIONS.REJECT);
    if (!isUuid(id)) return NOT_FOUND;

    const user = await getSessionUser();
    await db.transaction(async (tx) => {
      await createRefundContainer(tx).rejectService.execute(new ResolveRefundCommand(id, companyId, user?.id ?? null));
    });
  } catch (error) {
    return toActionError(error);
  }

  revalidatePath(refundRoutes.index(companyId));
  revalidatePath(refundRoutes.show(companyId, id));
  await setFlash('success', 'Reembolso rechazado correctamente.');
  redirect(refundRoutes.show(companyId, id));
}
