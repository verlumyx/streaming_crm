'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/db/client';
import { requirePermission } from '@/modules/shared/auth/require-permission';
import { toActionError, toFieldErrors, type ActionState } from '@/modules/shared/actions/action-state';
import { setFlash } from '@/modules/shared/flash/flash';
import { BOT_PERMISSIONS } from '@/modules/bot/permissions';
import { createBotContainer } from '@/modules/bot/container';
import { botRoutes } from '@/modules/bot/routes';
import { updateBotSettingsSchema } from '@/modules/bot/validation/update-bot-settings.schema';
import { UpdateBotSettingsCommand } from '@/modules/bot/commands/update-bot-settings.command';

/**
 * Prepares the company: system user that signs the bot's sales, its `Bot` role, the membership and
 * the settings row. Idempotent, so the button is safe to press twice.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- `useActionState` fixes the signature; setup takes no input.
export async function setupBotAction(companyId: string, _prev: ActionState, _formData: FormData): Promise<ActionState> {
  try {
    await requirePermission(companyId, BOT_PERMISSIONS.CONFIGURE);

    await db.transaction(async (tx) => {
      await createBotContainer(tx).setupService.execute(companyId);
    });
  } catch (error) {
    return toActionError(error);
  }

  revalidatePath(botRoutes.index(companyId));
  revalidatePath(botRoutes.settings(companyId));
  await setFlash('success', 'Asistente preparado. Configúralo y actívalo cuando esté listo.');
  redirect(botRoutes.settings(companyId));
}

export async function updateBotSettingsAction(
  companyId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requirePermission(companyId, BOT_PERMISSIONS.CONFIGURE);

    const parsed = updateBotSettingsSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return toFieldErrors(z.flattenError(parsed.error).fieldErrors);

    await db.transaction(async (tx) => {
      await createBotContainer(tx).settingsUpdateService.execute(
        UpdateBotSettingsCommand.fromInput(parsed.data, companyId),
      );
    });
  } catch (error) {
    return toActionError(error);
  }

  revalidatePath(botRoutes.index(companyId));
  revalidatePath(botRoutes.settings(companyId));
  await setFlash('success', 'Configuración del asistente guardada.');
  redirect(botRoutes.settings(companyId));
}
