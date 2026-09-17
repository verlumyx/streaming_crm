import type { BotProvider } from '@/modules/bot/models/bot-channel.model';
import type {
  BotContactStatus,
  BotMessageRole,
  BotMessageRow,
  BotMessageStatus,
  ConversationHandler,
  ConversationStatus,
} from '../models/conversation.model';
import type { ConversationWithContact } from '../repositories/conversation.repository';

export type ConversationDto = {
  id: string;
  code: string;
  status: ConversationStatus;
  handledBy: ConversationHandler;
  handoffReason: string | null;
  handoffExpiresAt: string | null;
  messageCount: number;
  lastMessageAt: string | null;
  lastInboundAt: string | null;
  /** True when Meta would refuse a free-form reply. */
  outsideServiceWindow: boolean;
  contact: {
    id: string;
    provider: BotProvider;
    externalId: string;
    displayName: string | null;
    phoneE164: string | null;
    clientId: string | null;
    status: BotContactStatus;
  };
};

export type BotMessageDto = {
  id: string;
  role: BotMessageRole;
  content: string;
  toolName: string | null;
  status: BotMessageStatus;
  error: string | null;
  createdAt: string;
};

const SERVICE_WINDOW_MS = 24 * 60 * 60 * 1000;

export function toConversationDto(row: ConversationWithContact, now = new Date()): ConversationDto {
  return {
    id: row.id,
    code: row.code,
    status: row.status,
    handledBy: row.handledBy,
    handoffReason: row.handoffReason,
    handoffExpiresAt: row.handoffExpiresAt?.toISOString() ?? null,
    messageCount: row.messageCount,
    lastMessageAt: row.lastMessageAt?.toISOString() ?? null,
    lastInboundAt: row.lastInboundAt?.toISOString() ?? null,
    outsideServiceWindow:
      row.contact.provider === 'whatsapp' &&
      (!row.lastInboundAt || now.getTime() - row.lastInboundAt.getTime() > SERVICE_WINDOW_MS),
    contact: {
      id: row.contact.id,
      provider: row.contact.provider,
      externalId: row.contact.externalId,
      displayName: row.contact.displayName,
      phoneE164: row.contact.phoneE164,
      clientId: row.contact.clientId,
      status: row.contact.status,
    },
  };
}

export function toBotMessageDto(row: BotMessageRow): BotMessageDto {
  return {
    id: row.id,
    role: row.role,
    content: row.content,
    toolName: row.toolName,
    status: row.status,
    error: row.error,
    createdAt: row.createdAt.toISOString(),
  };
}
