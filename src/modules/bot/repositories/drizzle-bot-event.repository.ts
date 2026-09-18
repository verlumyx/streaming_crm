import 'server-only';
import { and, count, desc, eq, sql } from 'drizzle-orm';
import type { DbExecutor } from '@/modules/shared/infrastructure/db-executor';
import {
  botEvents,
  isFinalAttempt,
  BOT_EVENT_BACKOFF_BASE_SECONDS,
  type BotEventRow,
  type BotEventStatus,
} from '../models/bot-event.model';
import type { BotEventRepository, BotEventSearch, EnqueueBotEventData } from './bot-event.repository';

export class DrizzleBotEventRepository implements BotEventRepository {
  constructor(private readonly db: DbExecutor) {}

  async enqueue(data: EnqueueBotEventData): Promise<boolean> {
    const inserted = await this.db
      .insert(botEvents)
      .values({
        id: data.id,
        companyId: data.companyId,
        channelId: data.channelId,
        provider: data.provider,
        externalEventId: data.externalEventId,
        contactExternalId: data.contactExternalId,
        payload: data.payload,
      })
      // The unique index on (provider, external_event_id) turns a provider retry into a no-op.
      .onConflictDoNothing({ target: [botEvents.provider, botEvents.externalEventId] })
      .returning({ id: botEvents.id });

    return inserted.length > 0;
  }

  async claim(limit: number, workerId: string): Promise<BotEventRow[]> {
    const rows = await this.db.execute<BotEventRow>(sql`
      update ${botEvents}
      set status = 'processing',
          locked_at = now(),
          locked_by = ${workerId},
          attempts = attempts + 1,
          updated_at = now()
      where id in (
        select id from ${botEvents}
        where status in ('pending', 'failed')
          and available_at <= now()
          and attempts < max_attempts
        order by created_at
        for update skip locked
        limit ${limit}
      )
      returning
        id, company_id as "companyId", channel_id as "channelId", provider,
        external_event_id as "externalEventId", contact_external_id as "contactExternalId",
        payload, status, attempts, max_attempts as "maxAttempts", last_error as "lastError",
        available_at as "availableAt", locked_at as "lockedAt", locked_by as "lockedBy",
        processed_at as "processedAt", created_at as "createdAt", updated_at as "updatedAt"
    `);

    return [...rows];
  }

  async markCompleted(id: string): Promise<void> {
    await this.db
      .update(botEvents)
      .set({ status: 'completed', processedAt: new Date(), lockedAt: null, lockedBy: null, lastError: null })
      .where(eq(botEvents.id, id));
  }

  async markFailed(row: BotEventRow, error: string): Promise<'failed' | 'dlq'> {
    const exhausted = isFinalAttempt(row);
    const status: BotEventStatus = exhausted ? 'dlq' : 'failed';
    // 2^attempts * 15s: a provider outage backs off instead of hammering.
    const delaySeconds = BOT_EVENT_BACKOFF_BASE_SECONDS * 2 ** row.attempts;

    await this.db
      .update(botEvents)
      .set({
        status,
        lastError: error.slice(0, 2000),
        lockedAt: null,
        lockedBy: null,
        availableAt: sql`now() + ${`${delaySeconds} seconds`}::interval`,
        ...(exhausted ? { processedAt: new Date() } : {}),
      })
      .where(eq(botEvents.id, row.id));

    return exhausted ? 'dlq' : 'failed';
  }

  async markDiscarded(id: string, reason: string): Promise<void> {
    await this.db
      .update(botEvents)
      .set({ status: 'discarded', processedAt: new Date(), lockedAt: null, lockedBy: null, lastError: reason })
      .where(eq(botEvents.id, id));
  }

  async reclaimStuck(olderThanMinutes: number): Promise<number> {
    const rows = await this.db
      .update(botEvents)
      .set({ status: 'pending', lockedAt: null, lockedBy: null, lastError: 'Worker interrumpido; reencolado.' })
      .where(
        and(
          eq(botEvents.status, 'processing'),
          sql`${botEvents.lockedAt} < now() - ${`${olderThanMinutes} minutes`}::interval`,
        ),
      )
      .returning({ id: botEvents.id });

    return rows.length;
  }

  async requeue(id: string, companyId: string): Promise<boolean> {
    const rows = await this.db
      .update(botEvents)
      // `now()` and not the Node clock: the claim compares against the database clock, and even a
      // second of drift between the app and Postgres would leave the event invisible.
      .set({ status: 'pending', attempts: 0, availableAt: sql`now()`, lastError: null, processedAt: null })
      .where(and(eq(botEvents.id, id), eq(botEvents.companyId, companyId)))
      .returning({ id: botEvents.id });

    return rows.length > 0;
  }

  async search(search: BotEventSearch): Promise<{ data: BotEventRow[]; total: number }> {
    const where = and(
      eq(botEvents.companyId, search.companyId),
      search.status ? eq(botEvents.status, search.status) : undefined,
    );

    const [{ total }] = await this.db.select({ total: count() }).from(botEvents).where(where);
    const data = await this.db
      .select()
      .from(botEvents)
      .where(where)
      .orderBy(desc(botEvents.createdAt))
      .limit(search.limit)
      .offset(search.offset);

    return { data, total };
  }

  async countByStatus(companyId: string): Promise<Record<BotEventStatus, number>> {
    const rows = await this.db
      .select({ status: botEvents.status, total: count() })
      .from(botEvents)
      .where(eq(botEvents.companyId, companyId))
      .groupBy(botEvents.status);

    const totals: Record<BotEventStatus, number> = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      dlq: 0,
      discarded: 0,
    };
    for (const row of rows) totals[row.status] = Number(row.total);
    return totals;
  }
}
