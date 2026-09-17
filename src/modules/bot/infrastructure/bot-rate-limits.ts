import { FixedWindowRateLimiter } from '@/modules/api-auth/infrastructure/fixed-window-rate-limiter';

/**
 * Protects the webhook from a flood before it reaches the database.
 *
 * In-memory and per process, like the rest of the project's limiters: with several instances each
 * one enforces its own window. The durable backstop against a single abusive contact is
 * `app_bot_settings.contact_daily_message_limit`, checked in the worker.
 */
export const webhookRateLimiter = new FixedWindowRateLimiter(120, 60_000);
