'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/db/client';
import { auth } from '@/lib/auth';
import { getSessionUser } from '@/modules/shared/auth/session';
import { toActionError, toFieldErrors, type ActionState } from '@/modules/shared/actions/action-state';
import { setFlash } from '@/modules/shared/flash/flash';
import { isUuid } from '@/modules/shared/uuid';
import { createSettingsContainer } from '@/modules/settings/container';
import { settingsRoutes } from '@/modules/settings/routes';
import { updateProfileSchema } from '@/modules/settings/validation/update-profile.schema';
import { setDefaultCompanySchema } from '@/modules/settings/validation/set-default-company.schema';
import { UpdateProfileCommand } from '@/modules/settings/commands/update-profile.command';
import { SetDefaultCompanyCommand } from '@/modules/settings/commands/set-default-company.command';
import type { SettingsActionState } from '@/modules/settings/ui/types/Settings';

// Settings belong to the session user: no role permission, only a valid session.
const SESSION_EXPIRED: ActionState = { status: 'error', message: 'Tu sesión ha expirado. Inicia sesión de nuevo.' };
const INVALID_COMPANY: ActionState = { status: 'error', message: 'La empresa no es válida.' };

/**
 * The session is cached in a signed cookie (5 min). Re-reading it with `disableCookieCache`
 * rewrites that cookie (nextCookies) so the header and better-auth endpoints such as
 * `send-verification-email` see the new name / email right away. Best effort.
 */
async function refreshSessionCookieCache(): Promise<void> {
  try {
    await auth.api.getSession({ headers: await headers(), query: { disableCookieCache: true } });
  } catch {
    // The profile is already saved; a stale cache only delays the header update.
  }
}

/** Perfil → stays on the page and reports "Guardado.". */
export async function updateProfileAction(
  companyId: string,
  _prev: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  try {
    if (!isUuid(companyId)) return INVALID_COMPANY;
    const sessionUser = await getSessionUser();
    if (!sessionUser) return SESSION_EXPIRED;

    const parsed = updateProfileSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return toFieldErrors(z.flattenError(parsed.error).fieldErrors);

    await db.transaction(async (tx) => {
      await createSettingsContainer(tx).updateProfileService.execute(
        UpdateProfileCommand.fromInput(parsed.data, sessionUser.id),
      );
    });
  } catch (error) {
    return toActionError(error);
  }

  await refreshSessionCookieCache();
  revalidatePath(`/${companyId}`, 'layout');
  return { status: 'success', message: 'Guardado.', savedAt: Date.now() };
}

/** Empresa predeterminada → back to the settings page with a flash. */
export async function setDefaultCompanyAction(companyId: string, targetCompanyId: string): Promise<ActionState> {
  try {
    if (!isUuid(companyId)) return INVALID_COMPANY;
    const sessionUser = await getSessionUser();
    if (!sessionUser) return SESSION_EXPIRED;

    const parsed = setDefaultCompanySchema.safeParse({ companyId: targetCompanyId });
    if (!parsed.success) return toFieldErrors(z.flattenError(parsed.error).fieldErrors);

    await db.transaction(async (tx) => {
      await createSettingsContainer(tx).setDefaultCompanyService.execute(
        SetDefaultCompanyCommand.fromInput(parsed.data, sessionUser.id),
      );
    });
  } catch (error) {
    return toActionError(error);
  }

  revalidatePath(`/${companyId}`, 'layout');
  await setFlash('success', 'Empresa predeterminada actualizada.');
  redirect(settingsRoutes.company(companyId));
}
