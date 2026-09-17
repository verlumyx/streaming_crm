import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { MetaCloudChannelGateway } from '@/modules/bot/channels/whatsapp/meta-cloud.gateway';
import { TelegramChannelGateway } from '@/modules/bot/channels/telegram/telegram.gateway';
import type { ChannelCredentials } from '@/modules/bot/channels/channel-gateway';
import whatsappText from '../../../fixtures/bot/whatsapp-text.json';
import whatsappStatus from '../../../fixtures/bot/whatsapp-status.json';
import telegramText from '../../../fixtures/bot/telegram-text.json';

const APP_SECRET = 'meta-app-secret';
const TELEGRAM_SECRET = 'telegram-webhook-secret';

const credentials = (overrides: Partial<ChannelCredentials> = {}): ChannelCredentials => ({
  externalId: '106540352242922',
  accessToken: 'token',
  appSecret: APP_SECRET,
  verifyToken: 'verify',
  webhookSecret: TELEGRAM_SECRET,
  apiVersion: 'v21.0',
  ...overrides,
});

const signed = (rawBody: string, secret = APP_SECRET) =>
  new Headers({
    'x-hub-signature-256': `sha256=${createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex')}`,
  });

describe('MetaCloudChannelGateway.parse', () => {
  const gateway = new MetaCloudChannelGateway();

  it('normalizes an inbound text message', () => {
    const { messages, statuses } = gateway.parse(whatsappText);

    expect(statuses).toEqual([]);
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({
      provider: 'whatsapp',
      channelExternalId: '106540352242922',
      eventId: 'wamid.HBgMNTg0MTIxMjM0NTY3FQIAEhgUM0E0QkQ0',
      contactExternalId: '584121234567',
      contactName: 'Camila Rojas',
      phoneE164: '+584121234567',
      text: 'Hola, ¿cuánto cuesta Netflix?',
      kind: 'text',
    });
  });

  it('accepts the bare `value` shape that Meta test console posts', () => {
    const { messages } = gateway.parse({ value: whatsappText.entry[0].changes[0].value });
    expect(messages).toHaveLength(1);
  });

  it('reports delivery statuses and no messages', () => {
    const { messages, statuses } = gateway.parse(whatsappStatus);

    expect(messages).toEqual([]);
    expect(statuses).toEqual([
      { externalMessageId: 'wamid.HBgMNTg0MTIxMjM0NTY3FQIAERgSRkFB', status: 'delivered', error: null },
    ]);
  });

  it('marks a non-text message as unsupported instead of dropping it', () => {
    const payload = structuredClone(whatsappText) as typeof whatsappText;
    const message = payload.entry[0].changes[0].value.messages[0] as Record<string, unknown>;
    message.type = 'audio';
    delete message.text;

    const { messages } = gateway.parse(payload);

    expect(messages[0]).toMatchObject({ kind: 'unsupported', text: null });
  });

  it('survives an empty or unknown payload', () => {
    expect(gateway.parse(null)).toEqual({ messages: [], statuses: [] });
    expect(gateway.parse({})).toEqual({ messages: [], statuses: [] });
    expect(gateway.parse({ entry: [] })).toEqual({ messages: [], statuses: [] });
  });
});

describe('MetaCloudChannelGateway.verify', () => {
  const gateway = new MetaCloudChannelGateway();
  const rawBody = JSON.stringify(whatsappText);

  it('accepts a signature computed over the raw body', () => {
    expect(gateway.verify({ rawBody, headers: signed(rawBody) }, credentials())).toBe(true);
  });

  it('rejects a signature made with another secret', () => {
    expect(gateway.verify({ rawBody, headers: signed(rawBody, 'otro') }, credentials())).toBe(false);
  });

  it('rejects when the body was altered after signing', () => {
    const headers = signed(rawBody);
    expect(gateway.verify({ rawBody: `${rawBody} `, headers }, credentials())).toBe(false);
  });

  it('rejects a missing header, and a channel without an app secret', () => {
    expect(gateway.verify({ rawBody, headers: new Headers() }, credentials())).toBe(false);
    expect(gateway.verify({ rawBody, headers: signed(rawBody) }, credentials({ appSecret: null }))).toBe(false);
  });
});

describe('TelegramChannelGateway', () => {
  const gateway = new TelegramChannelGateway('7654321:BOT');

  it('normalizes an inbound text message and builds an idempotent event id', () => {
    const { messages } = gateway.parse(telegramText);

    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({
      provider: 'telegram',
      eventId: 'tg:7654321:BOT:874251',
      contactExternalId: '987654321',
      contactName: 'Camila Rojas',
      // Telegram only gives a phone when the user shares their contact card.
      phoneE164: null,
      text: 'Hola, ¿cuánto cuesta Netflix?',
      kind: 'text',
    });
  });

  it('ignores updates from other bots and updates without a chat', () => {
    const fromBot = structuredClone(telegramText) as typeof telegramText;
    fromBot.message.from.is_bot = true;

    expect(gateway.parse(fromBot).messages).toEqual([]);
    expect(gateway.parse({ update_id: 1 }).messages).toEqual([]);
    expect(gateway.parse(null).messages).toEqual([]);
  });

  it('marks a message without text as unsupported', () => {
    const noText = structuredClone(telegramText) as unknown as { message: Record<string, unknown> };
    delete noText.message.text;

    expect(gateway.parse(noText).messages[0]).toMatchObject({ kind: 'unsupported', text: null });
  });

  it('accepts only the exact secret token', () => {
    const input = { rawBody: '{}', headers: new Headers({ 'x-telegram-bot-api-secret-token': TELEGRAM_SECRET }) };

    expect(gateway.verify(input, credentials())).toBe(true);
    expect(gateway.verify({ rawBody: '{}', headers: new Headers() }, credentials())).toBe(false);
    expect(
      gateway.verify(
        { rawBody: '{}', headers: new Headers({ 'x-telegram-bot-api-secret-token': 'otro' }) },
        credentials(),
      ),
    ).toBe(false);
    // A channel with no secret can never be trusted: Telegram does not sign payloads.
    expect(gateway.verify(input, credentials({ webhookSecret: null }))).toBe(false);
  });
});
