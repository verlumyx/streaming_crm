import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { botEvents } from '@/modules/bot/models/bot-event.model';
import { GET, POST } from '@/app/api/bot/webhooks/whatsapp/[channelId]/route';
import { uuidv7 } from '@/modules/shared/uuid';
import { resetDb } from '../../../helpers/reset-db';
import { createUserWithCompany } from '../../../helpers/company-context';
import {
  META_VERIFY_TOKEN,
  seedBotSettings,
  seedChannel,
  whatsappRequest,
  whatsappTextPayload,
} from '../../../helpers/bot-context';

const params = (channelId: string) => ({ params: Promise.resolve({ channelId }) });

const verifyRequest = (channelId: string, token: string) =>
  new Request(
    `http://localhost/api/bot/webhooks/whatsapp/${channelId}?hub.mode=subscribe&hub.verify_token=${token}&hub.challenge=1234`,
  );

async function context() {
  const { company } = await createUserWithCompany(db);
  await seedBotSettings(db, company.id, { status: 'active' });
  const channel = await seedChannel(db, company.id);
  return { company, channel };
}

describe('Webhook de WhatsApp — verificación', () => {
  beforeEach(resetDb);

  it('answers the challenge when the verify token matches', async () => {
    const { channel } = await context();

    const response = await GET(verifyRequest(channel.id, META_VERIFY_TOKEN), params(channel.id));

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('1234');
  });

  it('refuses a wrong verify token and an unknown channel', async () => {
    const { channel } = await context();

    expect((await GET(verifyRequest(channel.id, 'incorrecto'), params(channel.id))).status).toBe(403);
    expect((await GET(verifyRequest(uuidv7(), META_VERIFY_TOKEN), params(uuidv7()))).status).toBe(403);
    expect((await GET(verifyRequest('no-uuid', META_VERIFY_TOKEN), params('no-uuid'))).status).toBe(404);
  });
});

describe('Webhook de WhatsApp — recepción', () => {
  beforeEach(resetDb);

  it('queues a signed inbound message and answers 200', async () => {
    const { company, channel } = await context();

    const response = await POST(
      whatsappRequest(channel.id, whatsappTextPayload('Hola, ¿cuánto cuesta Netflix?')),
      params(channel.id),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: 'queued', queued: 1, duplicated: 0 });

    const [event] = await db.select().from(botEvents).where(eq(botEvents.companyId, company.id));
    expect(event).toMatchObject({ status: 'pending', provider: 'whatsapp', contactExternalId: '584121234567' });
    expect(event.payload).toMatchObject({ text: 'Hola, ¿cuánto cuesta Netflix?', kind: 'text' });
  });

  it('rejects an invalid signature and stores nothing', async () => {
    const { channel } = await context();

    const response = await POST(
      whatsappRequest(channel.id, whatsappTextPayload('Hola'), 'secreto-equivocado'),
      params(channel.id),
    );

    expect(response.status).toBe(401);
    expect(await db.select().from(botEvents)).toHaveLength(0);
  });

  it('is idempotent: the same wamid twice queues one event', async () => {
    const { channel } = await context();
    const payload = whatsappTextPayload('Hola', { wamid: 'wamid.REPETIDO' });

    const first = await POST(whatsappRequest(channel.id, payload), params(channel.id));
    const second = await POST(whatsappRequest(channel.id, payload), params(channel.id));

    expect(await first.json()).toMatchObject({ queued: 1, duplicated: 0 });
    expect(await second.json()).toMatchObject({ queued: 0, duplicated: 1 });
    expect(await db.select().from(botEvents)).toHaveLength(1);
  });

  it('acknowledges a delivery receipt without queuing anything', async () => {
    const { channel } = await context();

    const response = await POST(
      whatsappRequest(channel.id, {
        entry: [
          {
            changes: [
              {
                value: {
                  metadata: { phone_number_id: channel.externalId },
                  statuses: [{ id: 'wamid.ENVIADO', status: 'delivered' }],
                },
              },
            ],
          },
        ],
      }),
      params(channel.id),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: 'ignored' });
    expect(await db.select().from(botEvents)).toHaveLength(0);
  });

  it('refuses an inactive or unknown channel', async () => {
    const { company } = await createUserWithCompany(db);
    await seedBotSettings(db, company.id);
    const inactive = await seedChannel(db, company.id, 'whatsapp', { status: 'inactive' });

    expect((await POST(whatsappRequest(inactive.id, whatsappTextPayload('Hola')), params(inactive.id))).status).toBe(404);
    const unknown = uuidv7();
    expect((await POST(whatsappRequest(unknown, whatsappTextPayload('Hola')), params(unknown))).status).toBe(404);
  });

  it('rejects a body that is not JSON even when correctly signed', async () => {
    const { channel } = await context();
    const rawBody = 'esto no es json';
    const { createHmac } = await import('node:crypto');
    const request = new Request(`http://localhost/api/bot/webhooks/whatsapp/${channel.id}`, {
      method: 'POST',
      headers: {
        'x-hub-signature-256': `sha256=${createHmac('sha256', 'meta-app-secret-for-tests').update(rawBody, 'utf8').digest('hex')}`,
      },
      body: rawBody,
    });

    expect((await POST(request, params(channel.id))).status).toBe(400);
  });
});
