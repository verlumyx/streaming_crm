import { z } from 'zod';
import { BOT_CHANNEL_STATUSES } from '../models/bot-channel.model';

export const updateStatusBotChannelSchema = z.object({
  status: z.enum(BOT_CHANNEL_STATUSES, { message: 'El estado no es válido.' }),
});

export type UpdateStatusBotChannelInput = z.infer<typeof updateStatusBotChannelSchema>;
