import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { botEvents } from '@/modules/bot/models/bot-event.model';
import { POST } from '@/app/api/bot/webhooks/telegram/[channelId]/route';
import { uuidv7 } from '@/modules/shared/uuid';
import { resetDb } from '../../../helpers/reset-db';
import { createUserWithCompany } from '../../../helpers/company-context';
import { seedBotSettings, seedChannel, telegramRequest, telegramTextPayload } from '../../../helpers/bot-context';

const params = (channelId: string) => ({ params: Promise.resolve({ channelId }) });

async function context() {
  const { company } = await createUserWithCompany(db);
  await seedBotSettings(db, company.id, { status: 'active' });
  const channel = await seedChannel(db, company.id, 'telegram');
  return { company, channel };
}

describe('Webhook de Telegram', () => {
  beforeEach(resetDb);

  it('queues an update authenticated with the secret token', async () => {
    const { company, channel } = await context();

    const response = await POST(
      telegramRequest(channel.id, telegramTextPayload('Hola, ¿cuánto cuesta Netflix?')),
      params(channel.id),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: 'queued', queued: 1 });

    const [event] = await db.select().from(botEvents).where(eq(botEvents.companyId, company.id));
    expect(event).toMatchObject({ provider: 'telegram', contactExternalId: '987654321', status: 'pending' });
    expect(event.externalEventId.startsWith('tg:')).toBe(true);
  });

  it('rejects a wrong or missing secret token and stores nothing', async () => {
    const { channel } = await context();
    const payload = telegramTextPayload('Hola');

    expect((await POST(telegramRequest(channel.id, payload, 'incorrecto'), params(channel.id))).status).toBe(401);

    const noHeader = new Request(`http://localhost/api/bot/webhooks/telegram/${channel.id}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    expect((await POST(noHeader, params(channel.id))).status).toBe(401);
    expect(await db.select().from(botEvents)).toHaveLength(0);
  });

  it('is idempotent on `update_id`', async () => {
    const { channel } = await context();
    const payload = telegramTextPayload('Hola', { updateId: 4242 });

    const first = await POST(telegramRequest(channel.id, payload), params(channel.id));
    const second = await POST(telegramRequest(channel.id, payload), params(channel.id));

    expect(await first.json()).toMatchObject({ queued: 1 });
    expect(await second.json()).toMatchObject({ queued: 0, duplicated: 1 });
    expect(await db.select().from(botEvents)).toHaveLength(1);
  });

  it('ignores an update with nothing to answer', async () => {
    const { channel } = await context();

    const response = await POST(telegramRequest(channel.id, { update_id: 99 }), params(channel.id));

    expect(await response.json()).toMatchObject({ status: 'ignored' });
    expect(await db.select().from(botEvents)).toHaveLength(0);
  });

  it('refuses an unknown channel and one belonging to another provider', async () => {
    const { company } = await createUserWithCompany(db);
    await seedBotSettings(db, company.id);
    const whatsapp = await seedChannel(db, company.id, 'whatsapp');
    const payload = telegramTextPayload('Hola');

    const unknown = uuidv7();
    expect((await POST(telegramRequest(unknown, payload), params(unknown))).status).toBe(404);
    expect((await POST(telegramRequest(whatsapp.id, payload), params(whatsapp.id))).status).toBe(404);
  });
});
