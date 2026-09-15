/**
 * In-memory fixed-window limiter (per server process), equivalent to `throttle:10,1`.
 * Good enough for a single instance; use a shared store (Redis) when running several instances.
 */
export class FixedWindowRateLimiter {
  private readonly hits = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  /** Returns the seconds to wait when the key is over the limit, or null when allowed. */
  hit(key: string, now = Date.now()): number | null {
    const entry = this.hits.get(key);
    if (!entry || entry.resetAt <= now) {
      this.hits.set(key, { count: 1, resetAt: now + this.windowMs });
      return null;
    }
    entry.count++;
    return entry.count > this.limit ? Math.ceil((entry.resetAt - now) / 1000) : null;
  }
}
