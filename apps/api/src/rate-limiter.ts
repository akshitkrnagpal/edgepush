/**
 * Per-app rate limiter using a Durable Object.
 *
 * Simple token bucket: each app has a bucket that refills at a fixed rate.
 * The DO's state is durable so it survives Worker restarts, but we also
 * keep it in memory for fast access.
 *
 * The capacity can be overridden per-app via the `capacity` parameter
 * to `take()`. When the app's rate_limit_per_minute is NULL in D1,
 * the caller passes DEFAULT_CAPACITY. When it's set, the caller passes
 * the stored value.
 */

import { DurableObject } from "cloudflare:workers";

interface Bucket {
  tokens: number;
  lastRefillAt: number;
  capacity: number;
}

export const DEFAULT_CAPACITY = 1000; // max burst per minute

export class RateLimiter extends DurableObject {
  private bucket: Bucket | null = null;

  async take(
    amount: number,
    capacity: number = DEFAULT_CAPACITY,
  ): Promise<{ allowed: boolean; retryAfterMs: number }> {
    const refillPerSecond = capacity / 60;
    const now = Date.now();

    if (!this.bucket) {
      const stored = await this.ctx.storage.get<Bucket>("bucket");
      this.bucket = stored ?? {
        tokens: capacity,
        lastRefillAt: now,
        capacity,
      };
    }

    // If the configured capacity changed (operator or user updated the
    // rate limit), adjust the bucket on the fly. The bucket's max fills
    // to the new capacity and any excess tokens are trimmed.
    if (this.bucket.capacity !== capacity) {
      this.bucket.capacity = capacity;
      this.bucket.tokens = Math.min(this.bucket.tokens, capacity);
    }

    // Refill
    const elapsedSec = (now - this.bucket.lastRefillAt) / 1000;
    const refilled = elapsedSec * refillPerSecond;
    this.bucket.tokens = Math.min(capacity, this.bucket.tokens + refilled);
    this.bucket.lastRefillAt = now;

    if (this.bucket.tokens >= amount) {
      this.bucket.tokens -= amount;
      await this.ctx.storage.put("bucket", this.bucket);
      return { allowed: true, retryAfterMs: 0 };
    }

    const deficit = amount - this.bucket.tokens;
    const retryAfterMs = Math.ceil((deficit / refillPerSecond) * 1000);
    return { allowed: false, retryAfterMs };
  }
}
