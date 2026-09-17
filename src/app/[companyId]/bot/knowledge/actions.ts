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
import { BOT_PERMISSIONS } from '@/modules/bot/permissions';
import { botRoutes } from '@/modules/bot/routes';
import { createKnowledgeContainer } from '@/modules/knowledge/container';
import { createKnowledgeDocumentSchema } from '@/modules/knowledge/validation/create-knowledge-document.schema';
import { updateKnowledgeDocumentSchema } from '@/modules/knowledge/validation/update-knowledge-document.schema';
import { updateStatusKnowledgeDocumentSchema } from '@/modules/knowledge/validation/update-status-knowledge-document.schema';
import { CreateKnowledgeDocumentCommand } from '@/modules/knowledge/commands/create-knowledge-document.command';
import { UpdateKnowledgeDocumentCommand } from '@/modules/knowledge/commands/update-knowledge-document.command';
import { UpdateStatusKnowledgeDocumentCommand } from '@/modules/knowledge/commands/update-status-knowledge-document.command';

const NOT_FOUND: ActionState = { status: 'error', message: 'Documento no encontrado.' };

/** Crear → the document is queued; the worker embeds it. */
export async function createKnowledgeDocumentAction(
  companyId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requirePermission(companyId, BOT_PERMISSIONS.KNOWLEDGE_MANAGE);

    const parsed = createKnowledgeDocumentSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return toFieldErrors(z.flattenError(parsed.error).fieldErrors);

    const user = await getSessionUser();
    await db.transaction(async (tx) => {
      await createKnowledgeContainer(tx).createService.execute(
        CreateKnowledgeDocumentCommand.fromInput(parsed.data, companyId, user?.id ?? null),
      );
    });
  } catch (error) {
    return toActionError(error);
  }

  revalidatePath(botRoutes.knowledge(companyId));
  await setFlash('success', 'Documento creado. Se indexará en unos instantes.');
  redirect(botRoutes.knowledge(companyId));
}

export async function updateKnowledgeDocumentAction(
  companyId: string,
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requirePermission(companyId, BOT_PERMISSIONS.KNOWLEDGE_MANAGE);
    if (!isUuid(id)) return NOT_FOUND;

    const parsed = updateKnowledgeDocumentSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return toFieldErrors(z.flattenError(parsed.error).fieldErrors);

    await db.transaction(async (tx) => {
      await createKnowledgeContainer(tx).updateService.execute(
        id,
        companyId,
        UpdateKnowledgeDocumentCommand.fromInput(parsed.data),
      );
    });
  } catch (error) {
    return toActionError(error);
  }

  revalidatePath(botRoutes.knowledge(companyId));
  revalidatePath(botRoutes.knowledgeShow(companyId, id));
  await setFlash('success', 'Documento actualizado.');
  redirect(botRoutes.knowledgeShow(companyId, id));
}

/** Actualizar Estado. `inactive` takes it out of retrieval; nothing is deleted. */
export async function updateKnowledgeDocumentStatusAction(
  companyId: string,
  id: string,
  status: string,
  from: 'list' | 'show' = 'list',
): Promise<ActionState> {
  try {
    await requirePermission(companyId, BOT_PERMISSIONS.KNOWLEDGE_MANAGE);
    if (!isUuid(id)) return NOT_FOUND;

    const parsed = updateStatusKnowledgeDocumentSchema.safeParse({ status });
    if (!parsed.success) return toFieldErrors(z.flattenError(parsed.error).fieldErrors);

    await createKnowledgeContainer(db).updateStatusService.execute(
      id,
      companyId,
      UpdateStatusKnowledgeDocumentCommand.fromInput(parsed.data),
    );
  } catch (error) {
    return toActionError(error);
  }

  revalidatePath(botRoutes.knowledge(companyId));
  revalidatePath(botRoutes.knowledgeShow(companyId, id));
  await setFlash('success', 'Estado del documento actualizado.');
  redirect(from === 'show' ? botRoutes.knowledgeShow(companyId, id) : botRoutes.knowledge(companyId));
}

/** Forces a re-embed (e.g. after switching the embedding model). */
export async function reingestKnowledgeDocumentAction(companyId: string, id: string): Promise<ActionState> {
  try {
    await requirePermission(companyId, BOT_PERMISSIONS.KNOWLEDGE_MANAGE);
    if (!isUuid(id)) return NOT_FOUND;

    await createKnowledgeContainer(db).reingestService.execute(id, companyId);
  } catch (error) {
    return toActionError(error);
  }

  revalidatePath(botRoutes.knowledge(companyId));
  revalidatePath(botRoutes.knowledgeShow(companyId, id));
  await setFlash('success', 'Documento puesto en cola para reindexar.');
  redirect(botRoutes.knowledgeShow(companyId, id));
}
