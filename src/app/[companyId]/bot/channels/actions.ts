'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/db/client';
import { requirePermission } from '@/modules/shared/auth/require-permission';
import { toActionError, toFieldErrors, type ActionState } from '@/modules/shared/actions/action-state';
import { setFlash } from '@/modules/shared/flash/flash';
import { isUuid } from '@/modules/shared/uuid';
import { BOT_PERMISSIONS } from '@/modules/bot/permissions';
import { createBotContainer } from '@/modules/bot/container';
import { botRoutes, botWebhookPaths } from '@/modules/bot/routes';
import { createBotChannelSchema } from '@/modules/bot/validation/create-bot-channel.schema';
import { updateBotChannelSchema } from '@/modules/bot/validation/update-bot-channel.schema';
import { updateStatusBotChannelSchema } from '@/modules/bot/validation/update-status-bot-channel.schema';
import { UpdateBotChannelCommand } from '@/modules/bot/commands/update-bot-channel.command';
import { registerTelegramWebhook } from '@/modules/bot/services/register-telegram-webhook.service';

const NOT_FOUND: ActionState = { status: 'error', message: 'Canal no encontrado.' };

/**
 * Crear. For Telegram this also calls `getMe` and `setWebhook`, which are network calls, so they
 * happen OUTSIDE the transaction: a database connection is never held open across HTTP.
 */
export async function createBotChannelAction(
  companyId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let channelId: string;

  try {
    await requirePermission(companyId, BOT_PERMISSIONS.CHANNELS);

    const parsed = createBotChannelSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return toFieldErrors(z.flattenError(parsed.error).fieldErrors);

    const created = await createBotContainer(db).channelCreateService.execute(parsed.data, companyId);
    channelId = created.id;

    if (created.provider === 'telegram') await registerTelegramWebhook(db, created.id);
  } catch (error) {
    return toActionError(error);
  }

  revalidatePath(botRoutes.channels(companyId));
  await setFlash('success', 'Canal conectado. Actívalo cuando hayas configurado el webhook.');
  redirect(botRoutes.channelEdit(companyId, channelId));
}

export async function updateBotChannelAction(
  companyId: string,
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requirePermission(companyId, BOT_PERMISSIONS.CHANNELS);
    if (!isUuid(id)) return NOT_FOUND;

    const parsed = updateBotChannelSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return toFieldErrors(z.flattenError(parsed.error).fieldErrors);

    await db.transaction(async (tx) => {
      await createBotContainer(tx).channelUpdateService.execute(
        id,
        companyId,
        UpdateBotChannelCommand.fromInput(parsed.data),
      );
    });
  } catch (error) {
    return toActionError(error);
  }

  revalidatePath(botRoutes.channels(companyId));
  revalidatePath(botRoutes.channelEdit(companyId, id));
  await setFlash('success', 'Canal actualizado.');
  redirect(botRoutes.channels(companyId));
}

export async function updateBotChannelStatusAction(
  companyId: string,
  id: string,
  status: string,
): Promise<ActionState> {
  try {
    await requirePermission(companyId, BOT_PERMISSIONS.CHANNELS);
    if (!isUuid(id)) return NOT_FOUND;

    const parsed = updateStatusBotChannelSchema.safeParse({ status });
    if (!parsed.success) return toFieldErrors(z.flattenError(parsed.error).fieldErrors);

    await createBotContainer(db).channelUpdateStatusService.execute(id, companyId, parsed.data.status);
  } catch (error) {
    return toActionError(error);
  }

  revalidatePath(botRoutes.channels(companyId));
  await setFlash('success', 'Estado del canal actualizado.');
  redirect(botRoutes.channels(companyId));
}

/** Re-registers the Telegram webhook, e.g. after the public URL changed. */
export async function refreshTelegramWebhookAction(companyId: string, id: string): Promise<ActionState> {
  try {
    await requirePermission(companyId, BOT_PERMISSIONS.CHANNELS);
    if (!isUuid(id)) return NOT_FOUND;

    await createBotContainer(db).channelFindService.execute(id, companyId);
    await registerTelegramWebhook(db, id);
  } catch (error) {
    return toActionError(error);
  }

  revalidatePath(botRoutes.channelEdit(companyId, id));
  await setFlash('success', 'Webhook de Telegram registrado de nuevo.');
  redirect(botRoutes.channelEdit(companyId, id));
}

/** The URL to paste into the Meta console. Read-only, so it can be computed anywhere. */
export async function whatsappWebhookUrl(channelId: string): Promise<string> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? '';
  return `${base}${botWebhookPaths.whatsapp(channelId)}`;
}
