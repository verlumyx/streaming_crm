'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db } from '@/db/client';
import { requirePermission } from '@/modules/shared/auth/require-permission';
import { getSessionUser } from '@/modules/shared/auth/session';
import { toActionError, toFieldErrors, type ActionState } from '@/modules/shared/actions/action-state';
import { setFlash } from '@/modules/shared/flash/flash';
import { isUuid } from '@/modules/shared/uuid';
import { issuesToFieldErrors } from '@/modules/shared/validation/issues';
import { MANUAL_TRANSACTION_PERMISSIONS } from '@/modules/manual-transaction/permissions';
import { createManualTransactionContainer } from '@/modules/manual-transaction/container';
import { manualTransactionRoutes } from '@/modules/manual-transaction/routes';
import { createManualTransactionSchema } from '@/modules/manual-transaction/validation/create-manual-transaction.schema';
import { CreateManualTransactionCommand } from '@/modules/manual-transaction/commands/create-manual-transaction.command';

const NOT_FOUND: ActionState = { status: 'error', message: 'Transacción manual no encontrada.' };

/** Crear → redirects to the detail page. */
export async function createManualTransactionAction(
  companyId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let id: string;
  try {
    await requirePermission(companyId, MANUAL_TRANSACTION_PERMISSIONS.CREATE);

    const parsed = createManualTransactionSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return toFieldErrors(issuesToFieldErrors(parsed.error));

    const user = await getSessionUser();
    id = parsed.data.id;
    await db.transaction(async (tx) => {
      await createManualTransactionContainer(tx).createService.execute(
        CreateManualTransactionCommand.fromInput(parsed.data, companyId, user?.id ?? null),
      );
    });
  } catch (error) {
    return toActionError(error);
  }

  revalidatePath(manualTransactionRoutes.index(companyId));
  await setFlash('success', 'Transacción manual registrada correctamente.');
  redirect(manualTransactionRoutes.show(companyId, id));
}

/** Aprobar: one ledger entry per line, all in one transaction. */
export async function approveManualTransactionAction(companyId: string, id: string): Promise<ActionState> {
  try {
    await requirePermission(companyId, MANUAL_TRANSACTION_PERMISSIONS.APPROVE);
    if (!isUuid(id)) return NOT_FOUND;

    const user = await getSessionUser();
    await db.transaction(async (tx) => {
      await createManualTransactionContainer(tx).approveService.execute(id, companyId, user?.id ?? null);
    });
  } catch (error) {
    return toActionError(error);
  }

  revalidatePath(manualTransactionRoutes.index(companyId));
  revalidatePath(manualTransactionRoutes.show(companyId, id));
  await setFlash('success', 'Transacción manual aprobada correctamente.');
  redirect(manualTransactionRoutes.show(companyId, id));
}

/** Cancelar: no ledger entries. The header is locked, so it runs in a transaction. */
export async function cancelManualTransactionAction(companyId: string, id: string): Promise<ActionState> {
  try {
    await requirePermission(companyId, MANUAL_TRANSACTION_PERMISSIONS.CANCEL);
    if (!isUuid(id)) return NOT_FOUND;

    await db.transaction(async (tx) => {
      await createManualTransactionContainer(tx).cancelService.execute(id, companyId);
    });
  } catch (error) {
    return toActionError(error);
  }

  revalidatePath(manualTransactionRoutes.index(companyId));
  revalidatePath(manualTransactionRoutes.show(companyId, id));
  await setFlash('success', 'Transacción manual cancelada correctamente.');
  redirect(manualTransactionRoutes.show(companyId, id));
}
