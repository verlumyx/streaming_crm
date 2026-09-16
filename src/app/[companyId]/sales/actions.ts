'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/db/client';
import { requirePermission } from '@/modules/shared/auth/require-permission';
import { getSessionUser } from '@/modules/shared/auth/session';
import { toActionError, toFieldErrors, type ActionState } from '@/modules/shared/actions/action-state';
import { ForbiddenError } from '@/modules/shared/exceptions/domain-error';
import { setFlash } from '@/modules/shared/flash/flash';
import { isUuid } from '@/modules/shared/uuid';
import { SALE_PERMISSIONS } from '@/modules/sale/permissions';
import { createSaleContainer } from '@/modules/sale/container';
import { saleRoutes } from '@/modules/sale/routes';
import { createSaleSchema } from '@/modules/sale/validation/create-sale.schema';
import { renewSaleSchema } from '@/modules/sale/validation/renew-sale.schema';
import { reactivateSaleSchema } from '@/modules/sale/validation/reactivate-sale.schema';
import { cancelSaleSchema } from '@/modules/sale/validation/cancel-sale.schema';
import { rejectSaleSchema } from '@/modules/sale/validation/reject-sale.schema';
import { CreateSaleCommand } from '@/modules/sale/commands/create-sale.command';
import { RenewSaleCommand } from '@/modules/sale/commands/renew-sale.command';
import { ReactivateSaleCommand } from '@/modules/sale/commands/reactivate-sale.command';
import { CancelSaleCommand } from '@/modules/sale/commands/cancel-sale.command';
import { ApproveSaleCommand } from '@/modules/sale/commands/approve-sale.command';
import { RejectSaleCommand } from '@/modules/sale/commands/reject-sale.command';
import { toSaleClientOptionDto, type SaleClientOptionDto } from '@/modules/sale/serializers/sale.serializer';

export type SaleClientSearchResult = ActionState & { clients: SaleClientOptionDto[] };

const NOT_FOUND: ActionState = { status: 'error', message: 'Venta no encontrada.' };

/** FormData → plain object; `profileIds` is multi-valued. */
function formValues(formData: FormData): Record<string, unknown> {
  return { ...Object.fromEntries(formData), profileIds: formData.getAll('profileIds') };
}

/** Optional `returnTo` hidden field (dialogs reused by other pages). Only same-company relative paths are honored. */
function safeReturnTo(companyId: string, value: FormDataEntryValue | null, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const sameCompany = value.startsWith(`/${companyId}/`) && !value.includes('//') && !value.includes('\\');
  return sameCompany ? value : fallback;
}

function revalidateSale(companyId: string, id: string): void {
  revalidatePath(saleRoutes.index(companyId));
  revalidatePath(saleRoutes.show(companyId, id));
}

/**
 * Crear (wizard). One sale → redirects to it; several (`profile` plan with N profiles) → redirects to the
 * client's sales. A `conflict` state carries `details.unavailableProfiles`.
 */
export async function createSaleAction(companyId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  let saleIds: string[];
  let clientId: string;
  try {
    await requirePermission(companyId, SALE_PERMISSIONS.CREATE);

    const parsed = createSaleSchema.safeParse(formValues(formData));
    if (!parsed.success) return toFieldErrors(z.flattenError(parsed.error).fieldErrors);

    const user = await getSessionUser();
    if (!user) throw new ForbiddenError(SALE_PERMISSIONS.CREATE);

    const created = await db.transaction((tx) =>
      createSaleContainer(tx).createService.execute(CreateSaleCommand.fromInput(parsed.data, companyId, user.id)),
    );
    saleIds = created.map((sale) => sale.id);
    clientId = parsed.data.clientId;
  } catch (error) {
    return toActionError(error);
  }

  for (const saleId of saleIds) revalidateSale(companyId, saleId);

  if (saleIds.length === 1) {
    await setFlash('success', 'Venta registrada. Queda por aprobar hasta verificar el pago.');
    redirect(saleRoutes.show(companyId, saleIds[0]));
  }

  await setFlash('success', `${saleIds.length} ventas registradas. Quedan por aprobar hasta verificar el pago.`);
  redirect(saleRoutes.index(companyId, { clientId }));
}

/**
 * Aprobar (payment verified) → redirects to the sale (or to a same-company `returnTo`). Profiles taken meanwhile
 * return `status: 'conflict'` with `details.unavailableProfiles`.
 */
export async function approveSaleAction(companyId: string, id: string, returnTo?: string): Promise<ActionState> {
  try {
    await requirePermission(companyId, SALE_PERMISSIONS.APPROVE);
    if (!isUuid(id)) return NOT_FOUND;

    const user = await getSessionUser();
    await db.transaction(async (tx) => {
      await createSaleContainer(tx).approveService.execute(new ApproveSaleCommand(id, companyId, user?.id ?? null));
    });
  } catch (error) {
    return toActionError(error);
  }

  revalidateSale(companyId, id);
  await setFlash('success', 'Venta aprobada correctamente.');
  redirect(safeReturnTo(companyId, returnTo ?? null, saleRoutes.show(companyId, id)));
}

/** Rechazar (payment not verified) → redirects to the sale (or to a same-company `returnTo`). */
export async function rejectSaleAction(
  companyId: string,
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requirePermission(companyId, SALE_PERMISSIONS.APPROVE);
    if (!isUuid(id)) return NOT_FOUND;

    const parsed = rejectSaleSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return toFieldErrors(z.flattenError(parsed.error).fieldErrors);

    const user = await getSessionUser();
    await db.transaction(async (tx) => {
      await createSaleContainer(tx).rejectService.execute(
        RejectSaleCommand.fromInput(parsed.data, id, companyId, user?.id ?? null),
      );
    });
  } catch (error) {
    return toActionError(error);
  }

  revalidateSale(companyId, id);
  await setFlash('success', 'Venta rechazada.');
  redirect(safeReturnTo(companyId, formData.get('returnTo'), saleRoutes.show(companyId, id)));
}

/** Renovar → redirects to the sale (or to a same-company `returnTo`). */
export async function renewSaleAction(
  companyId: string,
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requirePermission(companyId, SALE_PERMISSIONS.RENEW);
    if (!isUuid(id)) return NOT_FOUND;

    const parsed = renewSaleSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return toFieldErrors(z.flattenError(parsed.error).fieldErrors);

    const user = await getSessionUser();
    await db.transaction(async (tx) => {
      await createSaleContainer(tx).renewService.execute(
        id,
        companyId,
        RenewSaleCommand.fromInput(parsed.data, user?.id ?? null),
      );
    });
  } catch (error) {
    return toActionError(error);
  }

  revalidateSale(companyId, id);
  await setFlash('success', 'Renovación registrada correctamente.');
  redirect(safeReturnTo(companyId, formData.get('returnTo'), saleRoutes.show(companyId, id)));
}

/** Reactivar → redirects to the sale. Unavailable profiles return `status: 'conflict'` (replacement mode). */
export async function reactivateSaleAction(
  companyId: string,
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requirePermission(companyId, SALE_PERMISSIONS.REACTIVATE);
    if (!isUuid(id)) return NOT_FOUND;

    const parsed = reactivateSaleSchema.safeParse(formValues(formData));
    if (!parsed.success) return toFieldErrors(z.flattenError(parsed.error).fieldErrors);

    const user = await getSessionUser();
    await db.transaction(async (tx) => {
      await createSaleContainer(tx).reactivateService.execute(
        id,
        companyId,
        ReactivateSaleCommand.fromInput(parsed.data, user?.id ?? null),
      );
    });
  } catch (error) {
    return toActionError(error);
  }

  revalidateSale(companyId, id);
  await setFlash('success', 'Venta reactivada correctamente.');
  redirect(safeReturnTo(companyId, formData.get('returnTo'), saleRoutes.show(companyId, id)));
}

/** Expulsar → redirects to the sale (or to a same-company `returnTo`). */
export async function cancelSaleAction(
  companyId: string,
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requirePermission(companyId, SALE_PERMISSIONS.CANCEL);
    if (!isUuid(id)) return NOT_FOUND;

    const parsed = cancelSaleSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return toFieldErrors(z.flattenError(parsed.error).fieldErrors);

    const user = await getSessionUser();
    await db.transaction(async (tx) => {
      await createSaleContainer(tx).cancelService.execute(
        id,
        companyId,
        CancelSaleCommand.fromInput(parsed.data, user?.id ?? null),
      );
    });
  } catch (error) {
    return toActionError(error);
  }

  revalidateSale(companyId, id);
  await setFlash('success', 'Venta expulsada correctamente.');
  redirect(safeReturnTo(companyId, formData.get('returnTo'), saleRoutes.show(companyId, id)));
}

/** Wizard step 1 search (debounced in the UI): ≤ 20 active clients by name or code. Guarded by `sales.create`. */
export async function searchSaleClientsAction(companyId: string, q: string): Promise<SaleClientSearchResult> {
  try {
    await requirePermission(companyId, SALE_PERMISSIONS.CREATE);
    const rows = await createSaleContainer(db).clientSearchService.execute(companyId, typeof q === 'string' ? q : '');
    return { status: 'idle', clients: rows.map(toSaleClientOptionDto) };
  } catch (error) {
    return { ...toActionError(error), clients: [] };
  }
}
