import { createHmac, timingSafeEqual } from 'node:crypto';
import { toE164 } from '@/lib/phone';
import type { BotProvider } from '../../models/bot-channel.model';
import type {
  ChannelCredentials,
  ChannelGateway,
  InboundMessage,
  InboundStatus,
  SendResult,
} from '../channel-gateway';

/** WhatsApp rejects anything longer; the sender leaves headroom below it. */
const MAX_MESSAGE_LENGTH = 4096;

/** Shape of the bits of Meta's webhook payload this gateway reads. */
type MetaValue = {
  metadata?: { phone_number_id?: string };
  contacts?: { wa_id?: string; profile?: { name?: string } }[];
  messages?: { id?: string; from?: string; timestamp?: string; type?: string; text?: { body?: string } }[];
  statuses?: { id?: string; status?: string; errors?: { title?: string; message?: string }[] }[];
};

export class MetaCloudChannelGateway implements ChannelGateway {
  readonly provider: BotProvider = 'whatsapp';
  readonly maxMessageLength = MAX_MESSAGE_LENGTH;

  parse(payload: unknown): { messages: InboundMessage[]; statuses: InboundStatus[] } {
    const messages: InboundMessage[] = [];
    const statuses: InboundStatus[] = [];

    for (const value of extractValues(payload)) {
      const channelExternalId = value.metadata?.phone_number_id ?? '';
      const nameByWaId = new Map(
        (value.contacts ?? []).map((contact) => [contact.wa_id ?? '', contact.profile?.name ?? null]),
      );

      for (const message of value.messages ?? []) {
        if (!message.id || !message.from) continue;
        const text = message.type === 'text' ? (message.text?.body ?? null) : null;

        messages.push({
          provider: 'whatsapp',
          channelExternalId,
          eventId: message.id,
          contactExternalId: message.from,
          contactName: nameByWaId.get(message.from) ?? null,
          // A `wa_id` is already the international number without the plus sign.
          phoneE164: toE164(message.from),
          text,
          kind: text === null ? 'unsupported' : 'text',
          sentAt: timestampToIso(message.timestamp),
        });
      }

      for (const status of value.statuses ?? []) {
        if (!status.id) continue;
        if (status.status === 'delivered' || status.status === 'read') {
          statuses.push({ externalMessageId: status.id, status: 'delivered', error: null });
        } else if (status.status === 'failed') {
          const error = status.errors?.[0];
          statuses.push({
            externalMessageId: status.id,
            status: 'failed',
            error: [error?.title, error?.message].filter(Boolean).join(': ') || 'Error desconocido',
          });
        }
      }
    }

    return { messages, statuses };
  }

  /**
   * `X-Hub-Signature-256` is an HMAC of the RAW body: re-serializing the parsed JSON changes the
   * bytes and the signature never matches. Compared in constant time.
   */
  verify(input: { rawBody: string; headers: Headers }, credentials: ChannelCredentials): boolean {
    if (!credentials.appSecret) return false;

    const received = input.headers.get('x-hub-signature-256') ?? '';
    const expected = `sha256=${createHmac('sha256', credentials.appSecret).update(input.rawBody, 'utf8').digest('hex')}`;

    return constantTimeEquals(received, expected);
  }

  async send(to: string, text: string, credentials: ChannelCredentials): Promise<SendResult> {
    const url = `https://graph.facebook.com/${credentials.apiVersion}/${credentials.externalId}/messages`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${credentials.accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { preview_url: false, body: text },
      }),
    });

    const body = (await response.json().catch(() => null)) as {
      messages?: { id?: string }[];
      error?: { message?: string; code?: number };
    } | null;

    if (!response.ok) {
      throw new ChannelSendError(
        body?.error?.message ?? `WhatsApp respondió ${response.status}.`,
        response.status,
        body?.error?.code ?? null,
      );
    }

    return { externalMessageId: body?.messages?.[0]?.id ?? null };
  }
}

/** A provider refused the message. `retryable` decides whether the event goes back to the queue. */
export class ChannelSendError extends Error {
  constructor(
    message: string,
    readonly httpStatus: number,
    readonly providerCode: number | null,
  ) {
    super(message);
    this.name = 'ChannelSendError';
  }

  /** 4xx means the request itself is wrong: retrying would just spam the customer. */
  get retryable(): boolean {
    return this.httpStatus >= 500 || this.httpStatus === 429;
  }

  /** 131047: no user-initiated message in the last 24 hours, so free-form text is not allowed. */
  get outsideServiceWindow(): boolean {
    return this.providerCode === 131047;
  }
}

/** Production sends `entry[].changes[].value`; Meta's test console posts a bare `value`. */
function extractValues(payload: unknown): MetaValue[] {
  const body = payload as { value?: MetaValue; entry?: { changes?: { value?: MetaValue }[] }[] } | null;
  if (!body) return [];
  if (body.value) return [body.value];

  return (body.entry ?? []).flatMap((entry) => (entry.changes ?? []).map((change) => change.value).filter(isValue));
}

function isValue(value: MetaValue | undefined): value is MetaValue {
  return value !== undefined;
}

function timestampToIso(timestamp: string | undefined): string {
  const seconds = Number(timestamp);
  return Number.isFinite(seconds) && seconds > 0 ? new Date(seconds * 1000).toISOString() : new Date().toISOString();
}

export function constantTimeEquals(a: string, b: string): boolean {
  const left = Buffer.from(a, 'utf8');
  const right = Buffer.from(b, 'utf8');
  // `timingSafeEqual` throws on different lengths, which would itself leak; compare lengths first.
  return left.length === right.length && timingSafeEqual(left, right);
}
