import { db } from '@/db/client';
import { isUuid } from '@/modules/shared/uuid';
import { createBotContainer } from '@/modules/bot/container';
import { TelegramChannelGateway } from '@/modules/bot/channels/telegram/telegram.gateway';
import { webhookRateLimiter } from '@/modules/bot/infrastructure/bot-rate-limits';
import { scheduleDrain } from '@/modules/bot/infrastructure/schedule-drain';

export const runtime = 'nodejs';

type Params = { params: Promise<{ channelId: string }> };

/**
 * Telegram Bot API webhook. One URL per channel, which is the natural multi-tenant shape here:
 * `setWebhook` is per bot token. Telegram does not sign payloads, so the `secret_token` header set
 * at registration IS the authentication and is mandatory.
 */
export async function POST(request: Request, { params }: Params): Promise<Response> {
  const { channelId } = await params;
  if (!isUuid(channelId)) return new Response('Not found', { status: 404 });

  const retryAfter = webhookRateLimiter.hit(`tg:${channelId}`);
  if (retryAfter !== null) {
    return new Response('Too many requests', { status: 429, headers: { 'Retry-After': String(retryAfter) } });
  }

  const rawBody = await request.text();

  const container = createBotContainer(db);
  const channel = await container.channelRepository.findActiveWithCredentials(channelId);
  if (!channel || channel.row.provider !== 'telegram') return new Response('Not found', { status: 404 });

  const gateway = new TelegramChannelGateway(channel.row.externalId);
  if (!gateway.verify({ rawBody, headers: request.headers }, channel.credentials)) {
    return Response.json({ status: 'invalid_secret' }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return Response.json({ status: 'invalid_payload' }, { status: 400 });
  }

  const { messages } = gateway.parse(payload);

  try {
    if (messages.length === 0) return Response.json({ status: 'ignored' }, { status: 200 });

    const report = await container.eventEnqueueService.execute(messages, channel.row);
    await container.channelRepository.touch(channel.row.id, null);

    scheduleDrain(() => container.drainQueue());

    return Response.json({ status: 'queued', ...report }, { status: 200 });
  } catch (error) {
    // 500 so Telegram retries: the update must not be lost.
    console.error('[telegram-webhook]', error);
    return Response.json({ status: 'error' }, { status: 500 });
  }
}
