import type { ConversationHandler, ConversationStatus } from '@/modules/conversation/models/conversation.model';

/** Query-string filters of the list (entity type is `ConversationDto` from the serializer). */
export type ConversationFilters = {
  status?: ConversationStatus;
  handledBy?: ConversationHandler;
};

export type ConversationMeta = { total: number; limit: number; offset: number; hasMore: boolean };
