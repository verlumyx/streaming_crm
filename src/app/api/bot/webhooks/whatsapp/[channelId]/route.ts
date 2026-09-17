import { db } from '@/db/client';
import { isUuid } from '@/modules/shared/uuid';
import { createBotContainer } from '@/modules/bot/container';
import { MetaCloudChannelGateway, constantTimeEquals } from '@/modules/bot/channels/whatsapp/meta-cloud.gateway';
import { webhookRateLimiter } from '@/modules/bot/infrastructure/bot-rate-limits';
import { scheduleDrain } from '@/modules/bot/infrastructure/schedule-drain';

/** `node:crypto` for the HMAC. */
export const runtime = 'nodejs';

type Params = { params: Promise<{ channelId: string }> };

const gateway = new MetaCloudChannelGateway();

/**
 * WhatsApp Cloud API webhook. The channel id is in the URL because Meta's GET handshake carries no
 * `phone_number_id`: without it there is no way to know whose verify token to compare against.
 * The id is not a secret — the HMAC signature on every POST is the real barrier.
 *
 * This is a Route Handler rather than a Server Action on purpose: it is an inbound HTTP call from
 * a third party, which a Server Action cannot receive.
 */
export async function GET(request: Request, { params }: Params): Promise<Response> {
  const { channelId } = await params;
  if (!isUuid(channelId)) return new Response('Not found', { status: 404 });

  const channel = await createBotContainer(db).channelRepository.findWithCredentials(channelId);
  if (!channel?.credentials.verifyToken) return new Response('Forbidden', { status: 403 });

  const url = new URL(request.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token') ?? '';
  const challenge = url.searchParams.get('hub.challenge') ?? '';

  if (mode !== 'subscribe' || !constantTimeEquals(token, channel.credentials.verifyToken)) {
    return new Response('Forbidden', { status: 403 });
  }

  return new Response(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } });
}

export async function POST(request: Request, { params }: Params): Promise<Response> {
  const { channelId } = await params;
  if (!isUuid(channelId)) return new Response('Not found', { status: 404 });

  const retryAfter = webhookRateLimiter.hit(`wa:${channelId}`);
  if (retryAfter !== null) {
    return new Response('Too many requests', { status: 429, headers: { 'Retry-After': String(retryAfter) } });
  }

  // The signature covers the exact bytes: re-serializing the parsed JSON would never match.
  const rawBody = await request.text();

  const container = createBotContainer(db);
  const channel = await container.channelRepository.findActiveWithCredentials(channelId);
  if (!channel) return new Response('Not found', { status: 404 });

  if (!gateway.verify({ rawBody, headers: request.headers }, channel.credentials)) {
    return Response.json({ status: 'invalid_signature' }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return Response.json({ status: 'invalid_payload' }, { status: 400 });
  }

  const { messages, statuses } = gateway.parse(payload);

  try {
    if (statuses.length > 0) await container.messageStatusService.execute(channel.row.companyId, statuses);
    // Delivery receipts and unsupported media are acknowledged without queuing anything.
    if (messages.length === 0) return Response.json({ status: 'ignored' }, { status: 200 });

    const report = await container.eventEnqueueService.execute(messages, channel.row);
    await container.channelRepository.touch(channel.row.id, null);

    // Answer first, work after: a slow model call must never make Meta time out and retry.
    scheduleDrain(() => container.drainQueue());

    return Response.json({ status: 'queued', ...report }, { status: 200 });
  } catch (error) {
    // 500 on purpose: Meta retries with backoff, and the message is not lost.
    console.error('[whatsapp-webhook]', error);
    return Response.json({ status: 'error' }, { status: 500 });
  }
}
