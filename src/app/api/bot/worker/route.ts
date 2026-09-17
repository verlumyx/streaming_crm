import { timingSafeEqual } from 'node:crypto';
import { db } from '@/db/client';
import { createBotContainer } from '@/modules/bot/container';

export const runtime = 'nodejs';
/** Long enough for a batch of model calls, short enough not to hang a serverless invocation. */
export const maxDuration = 60;

/**
 * Drains the queue from an external scheduler (Vercel Cron, cron-job.org) when running a long-lived
 * `pnpm bot:worker` is not an option. Same implementation as the worker; safety comes from
 * `FOR UPDATE SKIP LOCKED`, so both may run at once.
 *
 * Without `BOT_WORKER_SECRET` configured the endpoint answers 404 rather than 401: an unconfigured
 * deployment should not even admit it exists.
 */
export async function POST(request: Request): Promise<Response> {
  const secret = process.env.BOT_WORKER_SECRET;
  if (!secret) return new Response('Not found', { status: 404 });

  const provided = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  if (!constantTimeEquals(provided, secret)) return new Response('Unauthorized', { status: 401 });

  const batchSize = Number(process.env.BOT_WORKER_BATCH_SIZE ?? 5);
  const report = await createBotContainer(db).drainService(batchSize);

  return Response.json(report, { status: 200 });
}

function constantTimeEquals(a: string, b: string): boolean {
  const left = Buffer.from(a, 'utf8');
  const right = Buffer.from(b, 'utf8');
  return left.length === right.length && timingSafeEqual(left, right);
}
