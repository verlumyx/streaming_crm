'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/db/client';
import { requireSystemOwner } from '@/modules/shared/auth/require-permission';
import { getSessionUser } from '@/modules/shared/auth/session';
import { toActionError, toFieldErrors, type ActionState } from '@/modules/shared/actions/action-state';
import { ForbiddenError } from '@/modules/shared/exceptions/domain-error';
import { setFlash } from '@/modules/shared/flash/flash';
import { isUuid } from '@/modules/shared/uuid';
import { createCompanyContainer } from '@/modules/company/container';
import { companyRoutes } from '@/modules/company/routes';
import { createCompanySchema } from '@/modules/company/validation/create-company.schema';
import { updateCompanySchema } from '@/modules/company/validation/update-company.schema';
import { updateStatusCompanySchema } from '@/modules/company/validation/update-status-company.schema';
import { CreateCompanyCommand } from '@/modules/company/commands/create-company.command';
import { UpdateCompanyCommand } from '@/modules/company/commands/update-company.command';
import { UpdateStatusCompanyCommand } from '@/modules/company/commands/update-status-company.command';

const NOT_FOUND: ActionState = { status: 'error', message: 'Empresa no encontrada.' };

/** Company names/status also show up in the header company switcher of every company layout. */
function revalidateCompanies(companyId: string, id?: string): void {
  revalidatePath(companyRoutes.index(companyId));
  if (id) revalidatePath(companyRoutes.show(companyId, id));
  revalidatePath('/', 'layout');
}

/**
 * Crear → redirects to the list. Gated on `users.is_system_owner` (never on a role permission).
 * Company, Administrador role, default membership and services are created in ONE transaction.
 */
export async function createCompanyAction(
  companyId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requireSystemOwner();

    const parsed = createCompanySchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return toFieldErrors(z.flattenError(parsed.error).fieldErrors);

    const user = await getSessionUser();
    if (!user) throw new ForbiddenError('system_owner');

    await db.transaction(async (tx) => {
      await createCompanyContainer(tx).createService.execute(
        CreateCompanyCommand.fromInput(parsed.data, user.id),
      );
    });
  } catch (error) {
    return toActionError(error);
  }

  revalidateCompanies(companyId);
  await setFlash('success', 'Empresa creada correctamente.');
  redirect(companyRoutes.index(companyId));
}

/** Actualizar → redirects to the detail page. `id` is the target company, not the URL company. */
export async function updateCompanyAction(
  companyId: string,
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requireSystemOwner();
    if (!isUuid(id)) return NOT_FOUND;

    const parsed = updateCompanySchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return toFieldErrors(z.flattenError(parsed.error).fieldErrors);

    await db.transaction(async (tx) => {
      await createCompanyContainer(tx).updateService.execute(id, UpdateCompanyCommand.fromInput(parsed.data));
    });
  } catch (error) {
    return toActionError(error);
  }

  revalidateCompanies(companyId, id);
  await setFlash('success', 'Empresa actualizada correctamente.');
  redirect(companyRoutes.show(companyId, id));
}

/**
 * Actualizar Estado. Single atomic update, no transaction.
 * `from` decides where to land: the list (default) or back on the detail page.
 */
export async function updateCompanyStatusAction(
  companyId: string,
  id: string,
  status: string,
  from: 'list' | 'show' = 'list',
): Promise<ActionState> {
  try {
    await requireSystemOwner();
    if (!isUuid(id)) return NOT_FOUND;

    const parsed = updateStatusCompanySchema.safeParse({ status });
    if (!parsed.success) return toFieldErrors(z.flattenError(parsed.error).fieldErrors);

    await createCompanyContainer(db).updateStatusService.execute(
      id,
      UpdateStatusCompanyCommand.fromInput(parsed.data),
    );
  } catch (error) {
    return toActionError(error);
  }

  revalidateCompanies(companyId, id);
  await setFlash('success', 'Estado de la empresa actualizado correctamente.');
  redirect(from === 'show' ? companyRoutes.show(companyId, id) : companyRoutes.index(companyId));
}
