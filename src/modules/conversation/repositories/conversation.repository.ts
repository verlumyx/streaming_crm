import type {
  BotContactRow,
  BotConversationRow,
  BotMessageRole,
  BotMessageRow,
  BotMessageStatus,
} from '../models/conversation.model';
import type { BotProvider } from '@/modules/bot/models/bot-channel.model';

export type ResolveContactInput = {
  companyId: string;
  channelId: string;
  provider: BotProvider;
  externalId: string;
  displayName: string | null;
  phoneE164: string | null;
};

export type AppendMessageInput = {
  companyId: string;
  conversationId: string;
  eventId: string | null;
  role: BotMessageRole;
  content: string;
  toolName?: string | null;
  toolArgs?: unknown;
  toolResult?: unknown;
  externalMessageId?: string | null;
  status?: BotMessageStatus;
  error?: string | null;
  authorUserId?: string | null;
  tokenUsage?: unknown;
  latencyMs?: number | null;
};

/** A thread with the contact it belongs to: what the console list and the orchestrator both need. */
export type ConversationWithContact = BotConversationRow & { contact: BotContactRow };

export type ConversationSearch = {
  companyId: string;
  status?: BotConversationRow['status'];
  handledBy?: BotConversationRow['handledBy'];
  limit: number;
  offset: number;
};

export interface ConversationRepository {
  /**
   * Serializes everything that follows for this contact, so two messages arriving a second apart
   * cannot interleave the thread. Uses the same advisory-lock pattern as the code sequences.
   */
  lockContact(channelId: string, externalId: string): Promise<void>;

  resolveContact(input: ResolveContactInput): Promise<BotContactRow>;
  findContact(id: string, companyId: string): Promise<BotContactRow | null>;
  linkClient(contactId: string, clientId: string): Promise<void>;
  blockContact(contactId: string, companyId: string, reason: string, blockedBy: string | null): Promise<void>;
  unblockContact(contactId: string, companyId: string): Promise<void>;
  /** A client of this company whose phone matches, when the contact is not linked yet. */
  findClientIdByPhone(companyId: string, phoneE164: string): Promise<string | null>;

  /** Returns the contact's open thread, creating one (with its `CNV…` code) when there is none. */
  resolveOpenConversation(contact: BotContactRow, channelId: string): Promise<BotConversationRow>;
  findConversation(id: string, companyId: string): Promise<ConversationWithContact | null>;
  search(search: ConversationSearch): Promise<{ data: ConversationWithContact[]; total: number }>;

  appendMessage(input: AppendMessageInput): Promise<BotMessageRow>;
  /** Oldest first, capped at `limit`: what gets replayed to the model as context. */
  history(conversationId: string, limit: number): Promise<BotMessageRow[]>;
  messages(conversationId: string, companyId: string): Promise<BotMessageRow[]>;
  /**
   * True when an assistant reply for this event was already sent. Delivery is at-least-once, so
   * without this check a crash after sending would answer the customer twice.
   */
  hasAnsweredEvent(eventId: string): Promise<boolean>;
  updateMessageStatus(
    companyId: string,
    externalMessageId: string,
    status: BotMessageStatus,
    error: string | null,
  ): Promise<void>;
  markMessageSent(id: string, externalMessageId: string | null): Promise<void>;
  markMessageFailed(id: string, error: string): Promise<void>;

  /** Messages the bot answered this contact in the last 24 h: the durable abuse backstop. */
  countAssistantMessagesToday(contactId: string): Promise<number>;

  handOff(conversationId: string, reason: string, userId: string | null, expiresAt: Date): Promise<void>;
  returnToBot(conversationId: string, companyId: string): Promise<void>;
  close(conversationId: string, companyId: string, reason: string): Promise<void>;
  /** Handoffs whose window elapsed go back to the bot without anyone pressing a button. */
  expireHandoffs(): Promise<number>;
}
