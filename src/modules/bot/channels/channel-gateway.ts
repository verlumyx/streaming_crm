import type { BotProvider } from '../models/bot-channel.model';

/** A channel payload normalized to the one shape the orchestrator understands. */
export type InboundMessage = {
  provider: BotProvider;
  /** `phone_number_id` (WhatsApp) or the bot id (Telegram); used to sanity-check the channel. */
  channelExternalId: string;
  /** Idempotency key: `wamid.…` or `tg:{botId}:{updateId}`. */
  eventId: string;
  /** `wa_id` (WhatsApp) or `chat_id` (Telegram). */
  contactExternalId: string;
  contactName: string | null;
  phoneE164: string | null;
  text: string | null;
  /** `unsupported` = an audio, a sticker, a location…: stored, acknowledged, never answered by the model. */
  kind: 'text' | 'unsupported';
  sentAt: string;
};

/** Delivery statuses a provider reports back for messages we sent. */
export type InboundStatus = { externalMessageId: string; status: 'delivered' | 'failed'; error: string | null };

/** Everything a gateway needs, already decrypted. Never logged, never serialized to the client. */
export type ChannelCredentials = {
  externalId: string;
  accessToken: string;
  appSecret: string | null;
  verifyToken: string | null;
  webhookSecret: string | null;
  apiVersion: string;
};

export type SendResult = { externalMessageId: string | null };

export interface ChannelGateway {
  readonly provider: BotProvider;
  /** Provider hard limit per message; the sender chunks below it. */
  readonly maxMessageLength: number;

  /** PURE, no I/O — unit-tested against real payloads. */
  parse(payload: unknown): { messages: InboundMessage[]; statuses: InboundStatus[] };
  /** PURE — HMAC or shared secret, compared in constant time. */
  verify(input: { rawBody: string; headers: Headers }, credentials: ChannelCredentials): boolean;

  send(to: string, text: string, credentials: ChannelCredentials): Promise<SendResult>;
}
