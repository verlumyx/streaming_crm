import { toE164 } from '@/lib/phone';
import type { BotProvider } from '../../models/bot-channel.model';
import { ChannelSendError, constantTimeEquals } from '../whatsapp/meta-cloud.gateway';
import type {
  ChannelCredentials,
  ChannelGateway,
  InboundMessage,
  InboundStatus,
  SendResult,
} from '../channel-gateway';

const MAX_MESSAGE_LENGTH = 4096;
const API_BASE = 'https://api.telegram.org';

type TelegramMessage = {
  message_id?: number;
  date?: number;
  text?: string;
  chat?: { id?: number };
  from?: { first_name?: string; last_name?: string; username?: string; is_bot?: boolean };
  contact?: { phone_number?: string };
};

export class TelegramChannelGateway implements ChannelGateway {
  readonly provider: BotProvider = 'telegram';
  readonly maxMessageLength = MAX_MESSAGE_LENGTH;

  constructor(private readonly botId: string) {}

  parse(payload: unknown): { messages: InboundMessage[]; statuses: InboundStatus[] } {
    const update = payload as { update_id?: number; message?: TelegramMessage; edited_message?: TelegramMessage } | null;
    const message = update?.message ?? update?.edited_message;

    // Telegram has no delivery callbacks: a 200 on `sendMessage` is the only confirmation.
    if (!update?.update_id || !message?.chat?.id || message.from?.is_bot) return { messages: [], statuses: [] };

    const text = typeof message.text === 'string' && message.text !== '' ? message.text : null;

    return {
      statuses: [],
      messages: [
        {
          provider: 'telegram',
          channelExternalId: this.botId,
          eventId: `tg:${this.botId}:${update.update_id}`,
          contactExternalId: String(message.chat.id),
          contactName: displayName(message),
          // Only present when the user explicitly shares their contact card.
          phoneE164: toE164(message.contact?.phone_number),
          text,
          kind: text === null ? 'unsupported' : 'text',
          sentAt: message.date ? new Date(message.date * 1000).toISOString() : new Date().toISOString(),
        },
      ],
    };
  }

  /**
   * Telegram does not sign the payload; the `secret_token` set with `setWebhook` IS the
   * authentication, so it is mandatory and compared in constant time.
   */
  verify(input: { rawBody: string; headers: Headers }, credentials: ChannelCredentials): boolean {
    if (!credentials.webhookSecret) return false;

    return constantTimeEquals(
      input.headers.get('x-telegram-bot-api-secret-token') ?? '',
      credentials.webhookSecret,
    );
  }

  async send(to: string, text: string, credentials: ChannelCredentials): Promise<SendResult> {
    const response = await fetch(`${API_BASE}/bot${credentials.accessToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: to, text }),
    });

    const body = (await response.json().catch(() => null)) as {
      ok?: boolean;
      description?: string;
      error_code?: number;
      result?: { message_id?: number };
    } | null;

    if (!response.ok || body?.ok === false) {
      throw new ChannelSendError(
        body?.description ?? `Telegram respondió ${response.status}.`,
        response.status,
        body?.error_code ?? null,
      );
    }

    return { externalMessageId: body?.result?.message_id ? String(body.result.message_id) : null };
  }
}

function displayName(message: TelegramMessage): string | null {
  const full = [message.from?.first_name, message.from?.last_name].filter(Boolean).join(' ').trim();
  return full || message.from?.username || null;
}

/** Registers the webhook so Telegram starts pushing updates to this channel's URL. */
export async function setTelegramWebhook(
  botToken: string,
  url: string,
  secretToken: string,
): Promise<void> {
  const response = await fetch(`${API_BASE}/bot${botToken}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url,
      secret_token: secretToken,
      allowed_updates: ['message'],
      drop_pending_updates: true,
    }),
  });

  const body = (await response.json().catch(() => null)) as { ok?: boolean; description?: string } | null;
  if (!response.ok || body?.ok === false) {
    throw new ChannelSendError(body?.description ?? `Telegram respondió ${response.status}.`, response.status, null);
  }
}

/** Identifies the bot behind a token: its numeric id becomes the channel's `externalId`. */
export async function getTelegramBot(botToken: string): Promise<{ id: string; username: string }> {
  const response = await fetch(`${API_BASE}/bot${botToken}/getMe`);
  const body = (await response.json().catch(() => null)) as {
    ok?: boolean;
    description?: string;
    result?: { id?: number; username?: string };
  } | null;

  if (!response.ok || body?.ok === false || !body?.result?.id) {
    throw new ChannelSendError(body?.description ?? 'El token de Telegram no es válido.', response.status, null);
  }

  return { id: String(body.result.id), username: body.result.username ?? '' };
}
