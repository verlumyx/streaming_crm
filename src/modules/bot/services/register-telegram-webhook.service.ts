import 'server-only';
import type { DbExecutor } from '@/modules/shared/infrastructure/db-executor';
import { DrizzleBotChannelRepository } from '../repositories/drizzle-bot-channel.repository';
import { setTelegramWebhook } from '../channels/telegram/telegram.gateway';
import { botWebhookPaths } from '../routes';
import { BotChannelNotFoundException } from '../exceptions/bot-channel-not-found.exception';
import { ValidationError } from '@/modules/shared/exceptions/domain-error';

/**
 * Points the Telegram bot at this channel's webhook and locks it to the stored secret token.
 *
 * Deliberately outside any transaction: it is an HTTP call to api.telegram.org, and the project's
 * rule is that a database connection is never held open across network I/O.
 */
export async function registerTelegramWebhook(db: DbExecutor, channelId: string): Promise<void> {
  const base = process.env.NEXT_PUBLIC_APP_URL;
  if (!base) {
    throw new ValidationError('accessToken', 'Falta configurar NEXT_PUBLIC_APP_URL para registrar el webhook.');
  }

  const channel = await new DrizzleBotChannelRepository(db).findWithCredentials(channelId);
  if (!channel) throw new BotChannelNotFoundException();
  if (!channel.credentials.webhookSecret) {
    throw new ValidationError('accessToken', 'Este canal no tiene secreto de webhook.');
  }

  await setTelegramWebhook(
    channel.credentials.accessToken,
    `${base}${botWebhookPaths.telegram(channelId)}`,
    channel.credentials.webhookSecret,
  );
}
