import { uuidv7 } from '@/modules/shared/uuid';
import type { InboundMessage } from '../channels/channel-gateway';
import type { BotEventRepository } from '../repositories/bot-event.repository';

export type EnqueueReport = { queued: number; duplicated: number };

/**
 * Persists inbound messages so the webhook can answer 200 immediately. Everything expensive —
 * retrieval, the model, the tools — happens later in the worker, which is what keeps Meta and
 * Telegram from timing out and retrying a message we are already handling.
 */
export class BotEventEnqueueService {
  constructor(private readonly repository: BotEventRepository) {}

  async execute(messages: InboundMessage[], channel: { id: string; companyId: string }): Promise<EnqueueReport> {
    const report: EnqueueReport = { queued: 0, duplicated: 0 };

    for (const message of messages) {
      const queued = await this.repository.enqueue({
        id: uuidv7(),
        companyId: channel.companyId,
        channelId: channel.id,
        provider: message.provider,
        externalEventId: message.eventId,
        contactExternalId: message.contactExternalId,
        payload: message,
      });

      if (queued) report.queued++;
      else report.duplicated++;
    }

    return report;
  }
}
