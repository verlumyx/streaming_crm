import { z } from 'zod';
import { createConversationContainer } from '@/modules/conversation/container';
import type { BotTool } from './bot-tool';

const schema = z.object({
  motivo: z.string().min(3).max(255).describe('Por qué hace falta una persona, en una frase.'),
});

/**
 * Hands the thread to a human. The gate lives in the worker, not here: once the conversation is
 * `human`, inbound messages are stored and left unanswered until an agent returns it to the bot.
 */
export const escalarAHumanoTool: BotTool<typeof schema> = {
  name: 'escalar_a_humano',
  description:
    'Pasa la conversación a una persona del equipo. Úsala cuando el cliente lo pida explícitamente, ' +
    'cuando haya un reclamo, o cuando no puedas resolver lo que necesita.',
  schema,
  mutating: true,

  async execute({ motivo }, context) {
    await createConversationContainer(context.db).handoffService.execute(
      context.conversationId,
      motivo,
      null,
      context.settings.handoffMinutes,
    );

    return { ok: true, mensaje: 'Despídete brevemente y dile que una persona del equipo le escribirá enseguida.' };
  },
};
