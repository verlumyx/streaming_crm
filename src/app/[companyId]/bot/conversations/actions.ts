'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db } from '@/db/client';
import { requirePermission } from '@/modules/shared/auth/require-permission';
import { getSessionUser } from '@/modules/shared/auth/session';
import { toActionError, type ActionState } from '@/modules/shared/actions/action-state';
import { setFlash } from '@/modules/shared/flash/flash';
import { isUuid } from '@/modules/shared/uuid';
import { BOT_PERMISSIONS } from '@/modules/bot/permissions';
import { botRoutes } from '@/modules/bot/routes';
import { createBotContainer, gatewayFor } from '@/modules/bot/container';
import { createConversationContainer } from '@/modules/conversation/container';
import { chunkMessage } from '@/modules/bot/domain/message-chunking';

const NOT_FOUND: ActionState = { status: 'error', message: 'Conversación no encontrada.' };
const HANDOFF_FALLBACK_MINUTES = 60;

/** Silences the bot on this thread so a person can answer. */
export async function takeOverConversationAction(companyId: string, id: string): Promise<ActionState> {
  try {
    await requirePermission(companyId, BOT_PERMISSIONS.HANDOFF);
    if (!isUuid(id)) return NOT_FOUND;

    const user = await getSessionUser();
    const settings = await createBotContainer(db).settingsFindService.execute(companyId);

    await createConversationContainer(db).handoffService.execute(
      id,
      'Un agente tomó el control.',
      user?.id ?? null,
      settings?.handoffMinutes ?? HANDOFF_FALLBACK_MINUTES,
    );
  } catch (error) {
    return toActionError(error);
  }

  revalidatePath(botRoutes.conversationShow(companyId, id));
  await setFlash('success', 'Tomaste el control de la conversación.');
  redirect(botRoutes.conversationShow(companyId, id));
}

export async function returnConversationToBotAction(companyId: string, id: string): Promise<ActionState> {
  try {
    await requirePermission(companyId, BOT_PERMISSIONS.HANDOFF);
    if (!isUuid(id)) return NOT_FOUND;

    await createConversationContainer(db).repository.returnToBot(id, companyId);
  } catch (error) {
    return toActionError(error);
  }

  revalidatePath(botRoutes.conversationShow(companyId, id));
  await setFlash('success', 'El asistente vuelve a atender esta conversación.');
  redirect(botRoutes.conversationShow(companyId, id));
}

export async function closeConversationAction(companyId: string, id: string): Promise<ActionState> {
  try {
    await requirePermission(companyId, BOT_PERMISSIONS.HANDOFF);
    if (!isUuid(id)) return NOT_FOUND;

    await createConversationContainer(db).repository.close(id, companyId, 'Cerrada por un agente.');
  } catch (error) {
    return toActionError(error);
  }

  revalidatePath(botRoutes.conversations(companyId));
  await setFlash('success', 'Conversación cerrada.');
  redirect(botRoutes.conversations(companyId));
}

export async function blockContactAction(companyId: string, conversationId: string): Promise<ActionState> {
  try {
    await requirePermission(companyId, BOT_PERMISSIONS.HANDOFF);
    if (!isUuid(conversationId)) return NOT_FOUND;

    const conversations = createConversationContainer(db);
    const conversation = await conversations.findService.execute(conversationId, companyId);
    const user = await getSessionUser();

    await conversations.repository.blockContact(
      conversation.conversation.contactId,
      companyId,
      'Bloqueado por un agente.',
      user?.id ?? null,
    );
  } catch (error) {
    return toActionError(error);
  }

  revalidatePath(botRoutes.conversationShow(companyId, conversationId));
  await setFlash('success', 'Contacto bloqueado: el asistente dejará de responderle.');
  redirect(botRoutes.conversationShow(companyId, conversationId));
}

/**
 * Sends a message written by a person.
 *
 * Deliberately not wrapped in a single transaction: the send is an HTTP call to Meta or Telegram,
 * and a database connection must never stay open across network I/O. The message is persisted as
 * `queued` first, sent, and then marked in a second short write.
 */
export async function sendAgentMessageAction(
  companyId: string,
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requirePermission(companyId, BOT_PERMISSIONS.HANDOFF);
    if (!isUuid(id)) return NOT_FOUND;

    const text = String(formData.get('content') ?? '').trim();
    if (text === '') return { status: 'error', message: 'Escribe un mensaje antes de enviarlo.' };

    const conversations = createConversationContainer(db);
    const { conversation } = await conversations.findService.execute(id, companyId);
    const channel = await createBotContainer(db).channelRepository.findWithCredentials(conversation.channelId);
    if (!channel) return { status: 'error', message: 'El canal de esta conversación ya no existe.' };

    const user = await getSessionUser();
    const gateway = gatewayFor(channel.row);

    for (const chunk of chunkMessage(text, gateway.maxMessageLength - 96)) {
      const stored = await conversations.repository.appendMessage({
        companyId,
        conversationId: id,
        eventId: null,
        role: 'agent',
        content: chunk,
        status: 'queued',
        authorUserId: user?.id ?? null,
      });

      try {
        const sent = await gateway.send(conversation.contact.externalId, chunk, channel.credentials);
        await conversations.repository.markMessageSent(stored.id, sent.externalMessageId);
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        await conversations.repository.markMessageFailed(stored.id, reason);
        return { status: 'error', message: `No se pudo enviar: ${reason}` };
      }
    }
  } catch (error) {
    return toActionError(error);
  }

  revalidatePath(botRoutes.conversationShow(companyId, id));
  redirect(botRoutes.conversationShow(companyId, id));
}
