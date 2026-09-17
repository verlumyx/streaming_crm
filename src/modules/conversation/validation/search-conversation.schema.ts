import { z } from 'zod';
import { limitParam, offsetParam, optionalEnumFilter } from '@/modules/shared/validation/fields';
import { CONVERSATION_HANDLERS, CONVERSATION_STATUSES } from '../models/conversation.model';

/** Listar. Never throws: an unusable query param is ignored, not an error page. */
export const searchConversationSchema = z.object({
  status: optionalEnumFilter(CONVERSATION_STATUSES),
  handledBy: optionalEnumFilter(CONVERSATION_HANDLERS),
  limit: limitParam(),
  offset: offsetParam(),
});

export type SearchConversationInput = z.infer<typeof searchConversationSchema>;
