import { todayIsoDate } from '@/lib/format';
import type { DbExecutor } from '@/modules/shared/infrastructure/db-executor';
import { createConversationContainer } from '@/modules/conversation/container';
import { createClientContainer } from '@/modules/client/container';
import type { ChatModel, ChatTurn, EmbeddingModel } from '../infrastructure/ai-ports';
import type { ChannelGateway } from '../channels/channel-gateway';
import type { InboundMessage } from '../channels/channel-gateway';
import { ChannelSendError } from '../channels/whatsapp/meta-cloud.gateway';
import { chunkMessage } from '../domain/message-chunking';
import { OUT_OF_SERVICE_MESSAGE } from '../domain/service-notice';
import { resolveExchangeRate, usableExchangeRate } from '../domain/exchange-rate';
import { buildSystemPrompt } from '../domain/system-prompt';
import { isFinalAttempt, type BotEventRow } from '../models/bot-event.model';
import type { BotMessageRow } from '@/modules/conversation/models/conversation.model';
import type { BotChannelRepository } from '../repositories/bot-channel.repository';
import type { BotSettingsRepository } from '../repositories/bot-settings.repository';
import { buildToolRegistry } from '../tools/tool-registry';
import type { ToolContext } from '../tools/bot-tool';
import { BotToolRunner } from './bot-tool-runner.service';
import { BotAgentRunner, type AgentOutcome } from './bot-agent-runner.service';

/** What happened to one event; the worker only aggregates these. */
export type ProcessOutcome = 'answered' | 'discarded' | 'silenced';

export type ProcessDeps = {
  db: DbExecutor;
  chat: ChatModel;
  embeddings: EmbeddingModel;
  settingsRepository: BotSettingsRepository;
  channelRepository: BotChannelRepository;
  gatewayFor: (channel: { provider: string; externalId: string }) => ChannelGateway;
  runInTransaction: <T>(work: (tx: DbExecutor) => Promise<T>) => Promise<T>;
};

/**
 * One inbound message, end to end: resolve who is writing, decide whether the bot should answer at
 * all, retrieve context, reason with tools, persist everything and send the reply.
 *
 * Runs in the worker, not in the webhook, so a slow model call never makes a provider retry.
 */
export class BotProcessEventService {
  constructor(private readonly deps: ProcessDeps) {}

  async execute(event: BotEventRow): Promise<ProcessOutcome> {
    const message = event.payload as InboundMessage;
    const conversations = createConversationContainer(this.deps.db);

    // At-least-once delivery: if we already sent a reply for this event, do not send a second one.
    if (await conversations.repository.hasAnsweredEvent(event.id)) return 'answered';

    const settings = await this.deps.settingsRepository.findByCompany(event.companyId);
    const channel = await this.deps.channelRepository.findWithCredentials(event.channelId);
    if (!settings || !channel) return 'discarded';

    const { contact, conversation } = await conversations.resolveService.execute({
      companyId: event.companyId,
      channelId: event.channelId,
      provider: message.provider,
      externalId: message.contactExternalId,
      displayName: message.contactName,
      phoneE164: message.phoneE164,
    });

    await conversations.repository.appendMessage({
      companyId: event.companyId,
      conversationId: conversation.id,
      eventId: event.id,
      role: 'user',
      content: message.text ?? '[mensaje no compatible]',
      externalMessageId: message.eventId,
    });

    // Reasons to store the message and stay quiet, in order of how little work they cost.
    if (contact.status === 'blocked') return 'silenced';
    if (conversation.handledBy === 'human') return 'silenced';
    if (settings.status !== 'active') return 'silenced';
    if (message.kind !== 'text' || !message.text) return 'silenced';
    if ((await conversations.repository.countAssistantMessagesToday(contact.id)) >= settings.contactDailyMessageLimit) {
      return 'silenced';
    }

    const startedAt = Date.now();
    const tools = buildToolRegistry(settings);
    const exchangeRate = resolveExchangeRate(settings, new Date());
    const context: ToolContext = {
      db: this.deps.db,
      embeddings: this.deps.embeddings,
      companyId: event.companyId,
      botUserId: settings.agentUserId,
      conversationId: conversation.id,
      contactId: contact.id,
      clientId: contact.clientId,
      contactPhoneE164: contact.phoneE164,
      settings,
      exchangeRate: usableExchangeRate(exchangeRate),
      today: todayIsoDate(),
    };

    const runner = new BotAgentRunner(
      this.deps.chat,
      new BotToolRunner(tools, this.deps.runInTransaction),
    );

    const history = await conversations.repository.history(conversation.id, settings.historyWindow);
    const client = contact.clientId
      ? await createClientContainer(this.deps.db).findService.execute(contact.clientId, event.companyId)
      : null;

    const notice = {
      event,
      conversationId: conversation.id,
      to: message.contactExternalId,
      channel,
      handoffMinutes: settings.handoffMinutes,
    };

    let outcome: AgentOutcome;
    try {
      outcome = await runner.run({
        system: buildSystemPrompt({
          companyName: channel.row.displayName,
          assistantName: settings.assistantName,
          today: context.today,
          personaPrompt: settings.personaPrompt,
          paymentInstructions: settings.paymentInstructions,
          exchangeRate,
          contact: { displayName: contact.displayName, phoneE164: contact.phoneE164 },
          client: client ? { code: client.code, name: client.name } : null,
          autoCreateSale: settings.autoCreateSale,
          handoffEnabled: settings.handoffEnabled,
        }),
        history: toChatTurns(history),
        tools,
        model: settings.chatModel,
        temperature: Number(settings.temperature),
        maxIterations: settings.maxToolIterations,
        context,
      });
    } catch (error) {
      // Earlier attempts still have a retry coming; only the last one owes the customer a word.
      if (isFinalAttempt(event)) await this.warnOutOfService({ ...notice, reason: describeError(error) });
      throw error;
    }

    for (const run of outcome.toolRuns) {
      await conversations.repository.appendMessage({
        companyId: event.companyId,
        conversationId: conversation.id,
        eventId: event.id,
        role: 'tool',
        content: run.name,
        toolName: run.name,
        toolArgs: run.args,
        toolResult: run.result,
      });
    }

    const reply = outcome.text?.trim();
    if (!reply) {
      // Silence reads as broken to whoever is waiting, so it gets the same treatment as a failure.
      await this.warnOutOfService({
        ...notice,
        reason: outcome.exhausted
          ? 'El asistente no logró resolver la consulta.'
          : 'El asistente no generó respuesta.',
      });
      return 'silenced';
    }

    await this.reply({
      event,
      conversationId: conversation.id,
      to: message.contactExternalId,
      text: reply,
      channel,
      usage: outcome.usage,
      latencyMs: Date.now() - startedAt,
      lastInboundAt: conversation.lastInboundAt,
    });

    return 'answered';
  }

  /**
   * Last resort: tell the customer the assistant is down instead of leaving the message unanswered,
   * and put the thread in human hands. The notice is deliberately not tied to the event — otherwise
   * `hasAnsweredEvent` would take it for an answer and requeueing the event would never reply.
   */
  private async warnOutOfService(input: {
    event: BotEventRow;
    conversationId: string;
    to: string;
    channel: NonNullable<Awaited<ReturnType<BotChannelRepository['findWithCredentials']>>>;
    handoffMinutes: number;
    reason: string;
  }): Promise<void> {
    const conversations = createConversationContainer(this.deps.db);
    await conversations.handoffService.execute(
      input.conversationId,
      input.reason,
      null,
      input.handoffMinutes,
    );

    const stored = await conversations.repository.appendMessage({
      companyId: input.event.companyId,
      conversationId: input.conversationId,
      eventId: null,
      role: 'assistant',
      content: OUT_OF_SERVICE_MESSAGE,
      status: 'queued',
    });

    try {
      const sent = await this.deps
        .gatewayFor(input.channel.row)
        .send(input.to, OUT_OF_SERVICE_MESSAGE, input.channel.credentials);
      await conversations.repository.markMessageSent(stored.id, sent.externalMessageId);
    } catch (error) {
      // The customer is already being escalated; a failed notice must not hide the original error.
      const reason = describeSendError(error);
      await conversations.repository.markMessageFailed(stored.id, reason);
      await this.deps.channelRepository.touch(input.channel.row.id, reason);
    }
  }

  private async reply(input: {
    event: BotEventRow;
    conversationId: string;
    to: string;
    text: string;
    channel: NonNullable<Awaited<ReturnType<BotChannelRepository['findWithCredentials']>>>;
    usage: unknown;
    latencyMs: number;
    lastInboundAt: Date | null;
  }): Promise<void> {
    const conversations = createConversationContainer(this.deps.db);
    const gateway = this.deps.gatewayFor(input.channel.row);

    for (const chunk of chunkMessage(input.text, gateway.maxMessageLength - 96)) {
      const stored = await conversations.repository.appendMessage({
        companyId: input.event.companyId,
        conversationId: input.conversationId,
        eventId: input.event.id,
        role: 'assistant',
        content: chunk,
        status: 'queued',
        tokenUsage: input.usage,
        latencyMs: input.latencyMs,
      });

      try {
        const sent = await gateway.send(input.to, chunk, input.channel.credentials);
        await conversations.repository.markMessageSent(stored.id, sent.externalMessageId);
      } catch (error) {
        const reason = describeSendError(error);
        await conversations.repository.markMessageFailed(stored.id, reason);
        await this.deps.channelRepository.touch(input.channel.row.id, reason);

        // A 4xx will fail again identically; only a transient failure is worth retrying.
        if (error instanceof ChannelSendError && !error.retryable) return;
        throw error;
      }
    }
  }
}

/** The stored thread as the model expects it: oldest first, tool calls collapsed into text. */
function toChatTurns(messages: BotMessageRow[]): ChatTurn[] {
  return messages
    .filter((message) => message.role === 'user' || message.role === 'assistant' || message.role === 'agent')
    .map((message) => ({
      role: message.role === 'user' ? ('user' as const) : ('model' as const),
      parts: [{ kind: 'text' as const, text: message.content }],
    }));
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function describeSendError(error: unknown): string {
  if (error instanceof ChannelSendError && error.outsideServiceWindow) {
    return 'Fuera de la ventana de 24 horas de WhatsApp: hace falta una plantilla aprobada.';
  }
  return error instanceof Error ? error.message : String(error);
}
