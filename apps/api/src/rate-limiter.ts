/**
 * Per-app rate limiter using a Durable Object.
 *
 * Simple token bucket: each app has a bucket that refills at a fixed rate.
 * The DO's state is durable so it survives Worker restarts, but we also
 * keep it in memory for fast access.
 */

import { DurableObject } from "cloudflare:workers";

interface Bucket {
  tokens: number;
  lastRefillAt: number;
}

const DEFAULT_CAPACITY = 1000; // max burst per minute
const DEFAULT_REFILL_PER_SECOND = 1000 / 60; // ~16.67/s

export class RateLimiter extends DurableObject {
  private bucket: Bucket | null = null;

  async take(amount: number): Promise<{ allowed: boolean; retryAfterMs: number }> {
    const now = Date.now();
    if (!this.bucket) {
      const stored = await this.ctx.storage.get<Bucket>("bucket");
      this.bucket = stored ?? {
        tokens: DEFAULT_CAPACITY,
        lastRefillAt: now,
      };
    }

    // Refill
    const elapsedSec = (now - this.bucket.lastRefillAt) / 1000;
    const refilled = elapsedSec * DEFAULT_REFILL_PER_SECOND;
    this.bucket.tokens = Math.min(
      DEFAULT_CAPACITY,
      this.bucket.tokens + refilled,
    );
    this.bucket.lastRefillAt = now;

    if (this.bucket.tokens >= amount) {
      this.bucket.tokens -= amount;
      await this.ctx.storage.put("bucket", this.bucket);
      return { allowed: true, retryAfterMs: 0 };
    }

    const deficit = amount - this.bucket.tokens;
    const retryAfterMs = Math.ceil(
      (deficit / DEFAULT_REFILL_PER_SECOND) * 1000,
    );
    return { allowed: false, retryAfterMs };
  }
}
