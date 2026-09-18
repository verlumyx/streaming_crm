import 'server-only';
import { and, asc, count, desc, eq, isNotNull, sql } from 'drizzle-orm';
import type { DbExecutor } from '@/modules/shared/infrastructure/db-executor';
import { clients } from '@/modules/client/models/client.model';
import { generateNextCode, lockCompanySequence } from '@/modules/shared/infrastructure/sequential-code';
import { uuidv7 } from '@/modules/shared/uuid';
import {
  botContacts,
  botConversations,
  botMessages,
  CONVERSATION_CODE_PREFIX,
  type BotContactRow,
  type BotConversationRow,
  type BotMessageRow,
  type BotMessageStatus,
} from '../models/conversation.model';
import type {
  AppendMessageInput,
  ConversationRepository,
  ConversationSearch,
  ConversationWithContact,
  ResolveContactInput,
} from './conversation.repository';

export class DrizzleConversationRepository implements ConversationRepository {
  constructor(private readonly db: DbExecutor) {}

  async lockContact(channelId: string, externalId: string): Promise<void> {
    await this.db.execute(sql`select pg_advisory_xact_lock(hashtext(${`bot_contact:${channelId}:${externalId}`}))`);
  }

  async resolveContact(input: ResolveContactInput): Promise<BotContactRow> {
    const [existing] = await this.db
      .select()
      .from(botContacts)
      .where(and(eq(botContacts.channelId, input.channelId), eq(botContacts.externalId, input.externalId)))
      .limit(1);

    if (existing) {
      // Profile names and shared phone numbers can appear later in the conversation.
      const patch = {
        ...(input.displayName && input.displayName !== existing.displayName
          ? { displayName: input.displayName }
          : {}),
        ...(input.phoneE164 && !existing.phoneE164 ? { phoneE164: input.phoneE164 } : {}),
      };
      if (Object.keys(patch).length > 0) {
        await this.db.update(botContacts).set(patch).where(eq(botContacts.id, existing.id));
        return { ...existing, ...patch };
      }
      return existing;
    }

    const id = uuidv7();
    await this.db.insert(botContacts).values({
      id,
      companyId: input.companyId,
      channelId: input.channelId,
      provider: input.provider,
      externalId: input.externalId,
      displayName: input.displayName,
      phoneE164: input.phoneE164,
    });

    const [created] = await this.db.select().from(botContacts).where(eq(botContacts.id, id)).limit(1);
    return created;
  }

  async findContact(id: string, companyId: string): Promise<BotContactRow | null> {
    const [row] = await this.db
      .select()
      .from(botContacts)
      .where(and(eq(botContacts.id, id), eq(botContacts.companyId, companyId)))
      .limit(1);
    return row ?? null;
  }

  async linkClient(contactId: string, clientId: string): Promise<void> {
    await this.db.update(botContacts).set({ clientId }).where(eq(botContacts.id, contactId));
  }

  async blockContact(contactId: string, companyId: string, reason: string, blockedBy: string | null): Promise<void> {
    await this.db
      .update(botContacts)
      .set({ status: 'blocked', blockedReason: reason, blockedAt: new Date(), blockedBy })
      .where(and(eq(botContacts.id, contactId), eq(botContacts.companyId, companyId)));
  }

  async unblockContact(contactId: string, companyId: string): Promise<void> {
    await this.db
      .update(botContacts)
      .set({ status: 'active', blockedReason: null, blockedAt: null, blockedBy: null })
      .where(and(eq(botContacts.id, contactId), eq(botContacts.companyId, companyId)));
  }

  async findClientIdByPhone(companyId: string, phoneE164: string): Promise<string | null> {
    const rows = await this.db
      .select({ id: clients.id })
      .from(clients)
      .where(and(eq(clients.companyId, companyId), eq(clients.phoneE164, phoneE164), eq(clients.status, 'active')))
      .limit(2);

    // Two clients share the phone: the bot must not guess which one is writing.
    return rows.length === 1 ? rows[0].id : null;
  }

  async resolveOpenConversation(contact: BotContactRow, channelId: string): Promise<BotConversationRow> {
    const [open] = await this.db
      .select()
      .from(botConversations)
      .where(and(eq(botConversations.contactId, contact.id), eq(botConversations.status, 'open')))
      .limit(1);
    if (open) return open;

    await lockCompanySequence(this.db, contact.companyId, CONVERSATION_CODE_PREFIX);
    const code = await generateNextCode(this.db, botConversations, contact.companyId, CONVERSATION_CODE_PREFIX);

    const id = uuidv7();
    await this.db.insert(botConversations).values({
      id,
      companyId: contact.companyId,
      contactId: contact.id,
      channelId,
      code,
    });

    const [created] = await this.db.select().from(botConversations).where(eq(botConversations.id, id)).limit(1);
    return created;
  }

  async findConversation(id: string, companyId: string): Promise<ConversationWithContact | null> {
    const [row] = await this.db
      .select({ conversation: botConversations, contact: botContacts })
      .from(botConversations)
      .innerJoin(botContacts, eq(botContacts.id, botConversations.contactId))
      .where(and(eq(botConversations.id, id), eq(botConversations.companyId, companyId)))
      .limit(1);

    return row ? { ...row.conversation, contact: row.contact } : null;
  }

  async search(search: ConversationSearch): Promise<{ data: ConversationWithContact[]; total: number }> {
    const where = and(
      eq(botConversations.companyId, search.companyId),
      search.status ? eq(botConversations.status, search.status) : undefined,
      search.handledBy ? eq(botConversations.handledBy, search.handledBy) : undefined,
    );

    const [{ total }] = await this.db.select({ total: count() }).from(botConversations).where(where);
    const rows = await this.db
      .select({ conversation: botConversations, contact: botContacts })
      .from(botConversations)
      .innerJoin(botContacts, eq(botContacts.id, botConversations.contactId))
      .where(where)
      .orderBy(desc(botConversations.lastMessageAt), desc(botConversations.createdAt))
      .limit(search.limit)
      .offset(search.offset);

    return { data: rows.map((row) => ({ ...row.conversation, contact: row.contact })), total };
  }

  async appendMessage(input: AppendMessageInput): Promise<BotMessageRow> {
    const id = uuidv7();
    const [created] = await this.db
      .insert(botMessages)
      .values({
        id,
        companyId: input.companyId,
        conversationId: input.conversationId,
        eventId: input.eventId,
        role: input.role,
        content: input.content,
        toolName: input.toolName ?? null,
        toolArgs: input.toolArgs ?? null,
        toolResult: input.toolResult ?? null,
        externalMessageId: input.externalMessageId ?? null,
        status: input.status ?? 'sent',
        error: input.error ?? null,
        authorUserId: input.authorUserId ?? null,
        tokenUsage: input.tokenUsage ?? null,
        latencyMs: input.latencyMs ?? null,
      })
      // A retried event stores its inbound message again: the provider's message id makes the
      // second write a no-op instead of breaking the retry on the unique index.
      .onConflictDoNothing({ target: [botMessages.companyId, botMessages.externalMessageId] })
      .returning();

    if (!created) return this.findMessageByExternalId(input.companyId, input.externalMessageId!);

    const inbound = input.role === 'user';
    await this.db
      .update(botConversations)
      .set({
        lastMessageAt: new Date(),
        ...(inbound ? { lastInboundAt: new Date() } : {}),
        messageCount: sql`${botConversations.messageCount} + 1`,
      })
      .where(eq(botConversations.id, input.conversationId));

    return created;
  }

  private async findMessageByExternalId(companyId: string, externalMessageId: string): Promise<BotMessageRow> {
    const [existing] = await this.db
      .select()
      .from(botMessages)
      .where(and(eq(botMessages.companyId, companyId), eq(botMessages.externalMessageId, externalMessageId)))
      .limit(1);

    return existing;
  }

  async history(conversationId: string, limit: number): Promise<BotMessageRow[]> {
    const rows = await this.db
      .select()
      .from(botMessages)
      .where(eq(botMessages.conversationId, conversationId))
      .orderBy(desc(botMessages.createdAt), desc(botMessages.id))
      .limit(limit);

    // Newest-first for the LIMIT, oldest-first for the model.
    return rows.reverse();
  }

  async messages(conversationId: string, companyId: string): Promise<BotMessageRow[]> {
    return this.db
      .select()
      .from(botMessages)
      .where(and(eq(botMessages.conversationId, conversationId), eq(botMessages.companyId, companyId)))
      .orderBy(asc(botMessages.createdAt), asc(botMessages.id));
  }

  async hasAnsweredEvent(eventId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: botMessages.id })
      .from(botMessages)
      .where(
        and(
          eq(botMessages.eventId, eventId),
          eq(botMessages.role, 'assistant'),
          isNotNull(botMessages.externalMessageId),
        ),
      )
      .limit(1);

    return Boolean(row);
  }

  async updateMessageStatus(
    companyId: string,
    externalMessageId: string,
    status: BotMessageStatus,
    error: string | null,
  ): Promise<void> {
    await this.db
      .update(botMessages)
      .set({ status, error })
      .where(and(eq(botMessages.companyId, companyId), eq(botMessages.externalMessageId, externalMessageId)));
  }

  async markMessageSent(id: string, externalMessageId: string | null): Promise<void> {
    await this.db.update(botMessages).set({ status: 'sent', externalMessageId }).where(eq(botMessages.id, id));
  }

  async markMessageFailed(id: string, error: string): Promise<void> {
    await this.db.update(botMessages).set({ status: 'failed', error: error.slice(0, 2000) }).where(eq(botMessages.id, id));
  }

  async countAssistantMessagesToday(contactId: string): Promise<number> {
    const [row] = await this.db
      .select({ total: count() })
      .from(botMessages)
      .innerJoin(botConversations, eq(botConversations.id, botMessages.conversationId))
      .where(
        and(
          eq(botConversations.contactId, contactId),
          eq(botMessages.role, 'assistant'),
          sql`${botMessages.createdAt} > now() - interval '24 hours'`,
        ),
      );

    return Number(row?.total ?? 0);
  }

  async handOff(conversationId: string, reason: string, userId: string | null, expiresAt: Date): Promise<void> {
    await this.db
      .update(botConversations)
      .set({
        handledBy: 'human',
        handoffReason: reason.slice(0, 255),
        handoffAt: new Date(),
        handoffExpiresAt: expiresAt,
        assignedUserId: userId,
      })
      .where(eq(botConversations.id, conversationId));
  }

  async returnToBot(conversationId: string, companyId: string): Promise<void> {
    await this.db
      .update(botConversations)
      .set({ handledBy: 'bot', handoffReason: null, handoffAt: null, handoffExpiresAt: null, assignedUserId: null })
      .where(and(eq(botConversations.id, conversationId), eq(botConversations.companyId, companyId)));
  }

  async close(conversationId: string, companyId: string, reason: string): Promise<void> {
    await this.db
      .update(botConversations)
      .set({ status: 'closed', closedAt: new Date(), closedReason: reason.slice(0, 255) })
      .where(and(eq(botConversations.id, conversationId), eq(botConversations.companyId, companyId)));
  }

  async expireHandoffs(): Promise<number> {
    const rows = await this.db
      .update(botConversations)
      .set({ handledBy: 'bot', handoffReason: null, handoffAt: null, handoffExpiresAt: null, assignedUserId: null })
      .where(
        and(
          eq(botConversations.handledBy, 'human'),
          eq(botConversations.status, 'open'),
          sql`${botConversations.handoffExpiresAt} < now()`,
        ),
      )
      .returning({ id: botConversations.id });

    return rows.length;
  }
}
