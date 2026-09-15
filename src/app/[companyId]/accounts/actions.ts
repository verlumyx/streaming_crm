'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db } from '@/db/client';
import { requirePermission } from '@/modules/shared/auth/require-permission';
import { getSessionUser } from '@/modules/shared/auth/session';
import { toActionError, toFieldErrors, type ActionState } from '@/modules/shared/actions/action-state';
import { ForbiddenError } from '@/modules/shared/exceptions/domain-error';
import { setFlash } from '@/modules/shared/flash/flash';
import { isUuid } from '@/modules/shared/uuid';
import { ACCOUNT_PERMISSIONS } from '@/modules/account/permissions';
import { createAccountContainer } from '@/modules/account/container';
import { accountRoutes } from '@/modules/account/routes';
import { createAccountSchema } from '@/modules/account/validation/create-account.schema';
import { updateAccountSchema } from '@/modules/account/validation/update-account.schema';
import { renewAccountSchema } from '@/modules/account/validation/renew-account.schema';
import { issuesToFieldErrors } from '@/modules/shared/validation/issues';
import { CreateAccountCommand } from '@/modules/account/commands/create-account.command';
import { UpdateAccountCommand } from '@/modules/account/commands/update-account.command';
import { RenewAccountCommand } from '@/modules/account/commands/renew-account.command';

const NOT_FOUND: ActionState = { status: 'error', message: 'Cuenta no encontrada.' };

export type RevealAccountCredentialsResult = { status: 'ok'; email: string; password: string } | ActionState;

/** Crear → redirects to the detail page of the new account. */
export async function createAccountAction(
  companyId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let accountId: string;
  try {
    await requirePermission(companyId, ACCOUNT_PERMISSIONS.CREATE);

    const parsed = createAccountSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return toFieldErrors(issuesToFieldErrors(parsed.error));

    const user = await getSessionUser();
    await db.transaction(async (tx) => {
      await createAccountContainer(tx).createService.execute(
        CreateAccountCommand.fromInput(parsed.data, companyId, user?.id ?? null),
      );
    });
    accountId = parsed.data.id;
  } catch (error) {
    return toActionError(error);
  }

  revalidatePath(accountRoutes.index(companyId));
  await setFlash('success', 'Cuenta creada correctamente.');
  redirect(accountRoutes.show(companyId, accountId));
}

/** Actualizar → redirects to the detail page. */
export async function updateAccountAction(
  companyId: string,
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requirePermission(companyId, ACCOUNT_PERMISSIONS.UPDATE);
    if (!isUuid(id)) return NOT_FOUND;

    const parsed = updateAccountSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return toFieldErrors(issuesToFieldErrors(parsed.error));

    await db.transaction(async (tx) => {
      await createAccountContainer(tx).updateService.execute(id, companyId, UpdateAccountCommand.fromInput(parsed.data));
    });
  } catch (error) {
    return toActionError(error);
  }

  revalidatePath(accountRoutes.index(companyId));
  revalidatePath(accountRoutes.show(companyId, id));
  await setFlash('success', 'Cuenta actualizada correctamente.');
  redirect(accountRoutes.show(companyId, id));
}

/** Registrar renovación → redirects to the detail page. */
export async function renewAccountAction(
  companyId: string,
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requirePermission(companyId, ACCOUNT_PERMISSIONS.RENEW);
    if (!isUuid(id)) return NOT_FOUND;

    const parsed = renewAccountSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return toFieldErrors(issuesToFieldErrors(parsed.error));

    const user = await getSessionUser();
    await db.transaction(async (tx) => {
      await createAccountContainer(tx).renewService.execute(
        RenewAccountCommand.fromInput(parsed.data, companyId, id, user?.id ?? null),
      );
    });
  } catch (error) {
    return toActionError(error);
  }

  revalidatePath(accountRoutes.index(companyId));
  revalidatePath(accountRoutes.show(companyId, id));
  await setFlash('success', 'Renovación registrada correctamente.');
  redirect(accountRoutes.show(companyId, id));
}

/** Ver credenciales (read-only, replaces the original JSON endpoint). Decrypts and audits every access. */
export async function revealAccountCredentialsAction(
  companyId: string,
  id: string,
): Promise<RevealAccountCredentialsResult> {
  try {
    await requirePermission(companyId, ACCOUNT_PERMISSIONS.CREDENTIALS);
    if (!isUuid(id)) return NOT_FOUND;

    const user = await getSessionUser();
    const credentials = await createAccountContainer(db).credentialsService.execute(id, companyId, user?.id ?? null);
    return { status: 'ok', email: credentials.email, password: credentials.password };
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return { status: 'error', message: 'No tienes permiso para ver las credenciales.' };
    }
    return toActionError(error);
  }
}
