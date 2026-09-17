import { after } from 'next/server';

/**
 * Schedules the background drain after the 200 has been sent.
 *
 * `after()` only works inside a request scope; when the handler is invoked directly (integration
 * tests, scripts) it throws. That is harmless: the event is already persisted and `pnpm bot:worker`
 * is the authoritative drain, so the kick is best-effort by design.
 */
export function scheduleDrain(drain: () => Promise<void>): void {
  try {
    after(drain);
  } catch {
    // No request scope: the worker will pick the event up on its next cycle.
  }
}
