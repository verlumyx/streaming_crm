import { randomUUID } from 'node:crypto';
import type { BotEventRepository } from '../repositories/bot-event.repository';
import type { BotProcessEventService } from './bot-process-event.service';

export type DrainReport = {
  claimed: number;
  answered: number;
  silenced: number;
  discarded: number;
  failed: number;
  dlq: number;
};

/**
 * Takes a batch off the queue and processes it.
 *
 * Called from three places, all sharing this one implementation: `after()` in the webhook (low
 * latency), `pnpm bot:worker` (the authoritative drain, which also retries and reclaims), and the
 * protected `/api/bot/worker` endpoint (for a serverless cron). Safety comes from the database —
 * `FOR UPDATE SKIP LOCKED` — not from who calls it, so running all three at once is fine.
 */
export class BotQueueDrainService {
  constructor(
    private readonly repository: BotEventRepository,
    private readonly processor: BotProcessEventService,
    private readonly workerId = `worker-${randomUUID().slice(0, 8)}`,
  ) {}

  async execute(batchSize: number): Promise<DrainReport> {
    const events = await this.repository.claim(batchSize, this.workerId);
    const report: DrainReport = { claimed: events.length, answered: 0, silenced: 0, discarded: 0, failed: 0, dlq: 0 };

    for (const event of events) {
      try {
        const outcome = await this.processor.execute(event);
        if (outcome === 'discarded') await this.repository.markDiscarded(event.id, 'Canal o configuración ausente.');
        else await this.repository.markCompleted(event.id);

        report[outcome === 'answered' ? 'answered' : outcome === 'silenced' ? 'silenced' : 'discarded']++;
      } catch (error) {
        const landed = await this.repository.markFailed(event, error instanceof Error ? error.message : String(error));
        report[landed]++;
        console.error('[bot-worker] evento fallido', { eventId: event.id, error });
      }
    }

    return report;
  }
}
