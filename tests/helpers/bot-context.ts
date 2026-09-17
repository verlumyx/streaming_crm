import { createHmac } from 'node:crypto';
import type { DbExecutor } from '@/modules/shared/infrastructure/db-executor';
import { encrypt } from '@/modules/shared/crypto';
import { uuidv7 } from '@/modules/shared/uuid';
import { botChannels, type BotChannelRow, type BotProvider } from '@/modules/bot/models/bot-channel.model';
import { botSettings, type BotSettingsRow } from '@/modules/bot/models/bot-settings.model';
import { DrizzleBotSettingsRepository } from '@/modules/bot/repositories/drizzle-bot-settings.repository';
import { eq } from 'drizzle-orm';

export const META_APP_SECRET = 'meta-app-secret-for-tests';
export const META_VERIFY_TOKEN = 'verify-token-for-tests';
export const TELEGRAM_SECRET = 'telegram-secret-for-tests';
export const WHATSAPP_PHONE_NUMBER_ID = '106540352242922';
export const TELEGRAM_BOT_ID = '7654321';

/** Creates the bot user, role, membership and settings row exactly as the setup action does. */
export async function seedBotSettings(
  db: DbExecutor,
  companyId: string,
  overrides: Partial<BotSettingsRow> = {},
): Promise<BotSettingsRow> {
  const repository = new DrizzleBotSettingsRepository(db);
  const { userId } = await repository.ensureAgentIdentity(companyId);
  await repository.create(uuidv7(), companyId, userId);

  if (Object.keys(overrides).length > 0) {
    await db.update(botSettings).set(overrides).where(eq(botSettings.companyId, companyId));
  }

  return repository.findOrFail(companyId);
}

export async function seedChannel(
  db: DbExecutor,
  companyId: string,
  provider: BotProvider = 'whatsapp',
  overrides: Partial<BotChannelRow> = {},
): Promise<BotChannelRow> {
  const id = uuidv7();

  await db.insert(botChannels).values({
    id,
    companyId,
    provider,
    externalId: provider === 'whatsapp' ? WHATSAPP_PHONE_NUMBER_ID : TELEGRAM_BOT_ID,
    displayName: provider === 'whatsapp' ? 'Ventas WhatsApp' : '@ventas_bot',
    accessTokenEncrypted: encrypt('access-token'),
    appSecretEncrypted: provider === 'whatsapp' ? encrypt(META_APP_SECRET) : null,
    verifyTokenEncrypted: provider === 'whatsapp' ? encrypt(META_VERIFY_TOKEN) : null,
    webhookSecretEncrypted: provider === 'telegram' ? encrypt(TELEGRAM_SECRET) : null,
    status: 'active',
    ...overrides,
  });

  const [row] = await db.select().from(botChannels).where(eq(botChannels.id, id));
  return row;
}

/** A signed Meta webhook request, exactly as Graph sends it. */
export function whatsappRequest(channelId: string, body: unknown, secret = META_APP_SECRET): Request {
  const rawBody = JSON.stringify(body);

  return new Request(`http://localhost/api/bot/webhooks/whatsapp/${channelId}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-hub-signature-256': `sha256=${createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex')}`,
    },
    body: rawBody,
  });
}

export function telegramRequest(channelId: string, body: unknown, secret = TELEGRAM_SECRET): Request {
  return new Request(`http://localhost/api/bot/webhooks/telegram/${channelId}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-telegram-bot-api-secret-token': secret },
    body: JSON.stringify(body),
  });
}

/** An inbound WhatsApp text payload with a unique `wamid`. */
export function whatsappTextPayload(text: string, options: { from?: string; wamid?: string; name?: string } = {}) {
  return {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: 'waba-id',
        changes: [
          {
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              metadata: { display_phone_number: '15550783881', phone_number_id: WHATSAPP_PHONE_NUMBER_ID },
              contacts: [{ profile: { name: options.name ?? 'Camila Rojas' }, wa_id: options.from ?? '584121234567' }],
              messages: [
                {
                  from: options.from ?? '584121234567',
                  id: options.wamid ?? `wamid.${uuidv7()}`,
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  text: { body: text },
                  type: 'text',
                },
              ],
            },
          },
        ],
      },
    ],
  };
}

export function telegramTextPayload(text: string, options: { updateId?: number; chatId?: number } = {}) {
  return {
    update_id: options.updateId ?? Math.floor(Math.random() * 1_000_000),
    message: {
      message_id: 1,
      from: { id: options.chatId ?? 987654321, is_bot: false, first_name: 'Camila', last_name: 'Rojas' },
      chat: { id: options.chatId ?? 987654321, type: 'private' },
      date: Math.floor(Date.now() / 1000),
      text,
    },
  };
}
