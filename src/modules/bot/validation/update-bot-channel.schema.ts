import { z } from 'zod';
import { optionalText, requiredText } from '@/modules/shared/validation/fields';
import { BOT_CHANNEL_STATUSES, DEFAULT_GRAPH_API_VERSION } from '../models/bot-channel.model';

/**
 * Secrets are optional on update: an empty field means "keep the stored one", so the form never has
 * to render a token back to the browser.
 */
export const updateBotChannelSchema = z.object({
  displayName: requiredText('El nombre', 100),
  accessToken: optionalText('El token de acceso', 500),
  appSecret: optionalText('El app secret', 500),
  verifyToken: optionalText('El verify token', 200),
  wabaId: optionalText('El WABA id', 64),
  graphApiVersion: requiredText('La versión de la API', 10).default(DEFAULT_GRAPH_API_VERSION),
  status: z.enum(BOT_CHANNEL_STATUSES, { message: 'El estado no es válido.' }),
});

export type UpdateBotChannelInput = z.infer<typeof updateBotChannelSchema>;
