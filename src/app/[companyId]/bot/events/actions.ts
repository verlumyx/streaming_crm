'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db } from '@/db/client';
import { requirePermission } from '@/modules/shared/auth/require-permission';
import { toActionError, type ActionState } from '@/modules/shared/actions/action-state';
import { setFlash } from '@/modules/shared/flash/flash';
import { isUuid } from '@/modules/shared/uuid';
import { BOT_PERMISSIONS } from '@/modules/bot/permissions';
import { botRoutes } from '@/modules/bot/routes';
import { createBotContainer } from '@/modules/bot/container';

/** Puts a dead-lettered or failed event back in the queue with a clean attempt count. */
export async function requeueBotEventAction(companyId: string, id: string): Promise<ActionState> {
  try {
    await requirePermission(companyId, BOT_PERMISSIONS.EVENTS);
    if (!isUuid(id)) return { status: 'error', message: 'Evento no encontrado.' };

    const requeued = await createBotContainer(db).eventRepository.requeue(id, companyId);
    if (!requeued) return { status: 'error', message: 'Evento no encontrado.' };
  } catch (error) {
    return toActionError(error);
  }

  revalidatePath(botRoutes.events(companyId));
  await setFlash('success', 'Evento reencolado. El worker lo tomará en el próximo ciclo.');
  redirect(botRoutes.events(companyId));
}
