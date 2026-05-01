/**
 * POST /v1/send - accept a batch of push messages for dispatch.
 *
 * Auth: Bearer <packageName>|<secret>
 * Body: { messages: PushMessage[] }  (up to 100)
 *
 * Flow:
 *   1. Validate API key and extract appId.
 *   2. Rate limit via the app's Durable Object.
 *   3. For each message, insert a row in `messages` with status "queued".
 *   4. Direct-first: for batches up to INLINE_THRESHOLD, attempt inline
 *      APNs/FCM dispatch. Any transient failures fall back to the
 *      queue. Larger batches skip inline and go straight to the queue.
 *   5. Return tickets - each carrying its synchronous delivery result
 *      when known, or "queued" when the queue will handle it.
 *
 * Why direct-first: the queue's max_batch_timeout adds 1-5s of
 * batching latency at low send rates. Calling APNs/FCM synchronously
 * keeps device-perceived latency at one HTTPS round-trip when things
 * are healthy, while still using the queue for retries and for batches
 * large enough to benefit from buffering.
 */

import { Hono } from "hono";

import { SendRequestSchema, type SendResponseItem } from "@edgepush/orpc";
import { authenticateApiKey, authenticateSessionApp } from "../lib/auth";
import { generateId } from "../lib/crypto";
import { messages } from "../db/schema";
import { inlineDispatchAppBatch } from "../inline-dispatch";
import { reserveMonthlyUsage } from "../lib/plan";
import type { RateLimiter } from "../rate-limiter";
import type { AppContext, DispatchJob } from "../types";
import { inArray } from "drizzle-orm";

/**
 * Kill switch KV key. Non-empty value here disables /v1/send before
 * auth or any DB read. Operator flips it with `wrangler kv:key put`.
 */
const KILLSWITCH_SEND_KEY = "edgepush:killswitch:send";

/**
 * Above this batch size we skip the inline path entirely. The queue's
 * batching is genuinely useful for large fan-outs (cred loads
 * amortized across the batch, single APNs/FCM connection reused). At
 * smaller batches the batching is just dead latency.
 */
const INLINE_THRESHOLD = 10;

export const sendRouter = new Hono<AppContext>();

sendRouter.post("/send", async (c) => {
  // Kill switch check, first thing, before auth or anything that
  // might hit D1. Non-null value = send is disabled.
  const killswitch = await c.env.CACHE.get(KILLSWITCH_SEND_KEY);
  if (killswitch) {
    return c.json(
      {
        error: "maintenance",
        detail: killswitch,
      },
      503,
      {
        "retry-after": "60",
      },
    );
  }

  // Auth: API key OR session token + X-Edgepush-App header (CLI).
  let authedApp = await authenticateApiKey(
    c.var.db,
    c.req.header("authorization") ?? null,
  );
  if (!authedApp) {
    const authHeader = c.req.header("authorization");
    const appIdHeader = c.req.header("x-edgepush-app");
    if (authHeader?.startsWith("Bearer ") && appIdHeader) {
      authedApp = await authenticateSessionApp(
        c.var.db,
        authHeader.slice(7),
        appIdHeader,
      );
    }
  }
  if (!authedApp) {
    return c.json({ error: "unauthorized" }, 401);
  }

  const parseResult = SendRequestSchema.safeParse(await c.req.json());
  if (!parseResult.success) {
    return c.json(
      { error: "invalid_request", issues: parseResult.error.issues },
      400,
    );
  }
  const { messages: msgs } = parseResult.data;

  // Per-app burst rate limit via Durable Object. Cheap, reversible.
  // Runs before the monthly quota so rate-limited requests don't eat
  // billable events, a rate-limited send is a retry-later, not a
  // consumed event.
  const limiterId = c.env.RATE_LIMITER.idFromName(authedApp.appId);
  const limiter = c.env.RATE_LIMITER.get(
    limiterId,
  ) as unknown as DurableObjectStub<RateLimiter>;

  // Demo mode caps rate limit at 50/min regardless of per-app config.
  const DEMO_RATE_CAP = 50;
  const isDemo = c.env.DEMO_MODE === "true";
  const effectiveLimit = isDemo
    ? DEMO_RATE_CAP
    : (authedApp.rateLimitPerMinute ?? undefined);

  const rateLimit = await limiter.take(msgs.length, effectiveLimit);
  if (!rateLimit.allowed) {
    return c.json(
      { error: "rate_limited", retry_after_ms: rateLimit.retryAfterMs },
      429,
    );
  }

  // Monthly quota check (hosted mode only). Atomic reservation, if we
  // can't fit `msgs.length` new events under the plan limit, reject the
  // entire batch. All-or-nothing semantics so the caller doesn't have
  // to track partial success. Self-host bypasses entirely.
  const quota = await reserveMonthlyUsage(
    c.env,
    c.var.db,
    authedApp.userId,
    msgs.length,
  );
  if (!quota.ok) {
    return c.json(
      {
        error: "quota_exceeded",
        plan: quota.plan,
        limit: quota.limit,
        used: quota.used,
        year_month: quota.yearMonth,
        detail: `monthly send limit for plan "${quota.plan}" is ${quota.limit} events and you have already used ${quota.used}. upgrade at /pricing to raise your cap.`,
      },
      429,
      {
        "x-ratelimit-limit": String(quota.limit),
        "x-ratelimit-used": String(quota.used),
        "x-ratelimit-scope": "monthly",
      },
    );
  }

  const now = Date.now();
  const idByIndex: string[] = [];
  const rows: Array<typeof messages.$inferInsert> = [];

  for (const msg of msgs) {
    const id = generateId();
    idByIndex.push(id);

    const target = msg.to ?? msg.topic ?? msg.condition ?? "";
    const isBroadcast = !msg.to;
    const platform = isBroadcast
      ? "android"
      : (msg.platform ?? inferPlatform(msg.to!));

    rows.push({
      id,
      appId: authedApp.appId,
      to: target,
      platform,
      title: msg.title ?? null,
      body: msg.body ?? null,
      payloadJson: JSON.stringify(msg),
      status: "queued",
      tokenInvalid: false,
      createdAt: now,
      updatedAt: now,
    });
  }

  await c.var.db.insert(messages).values(rows);

  // Below the threshold we try inline dispatch. Above, straight to the
  // queue (existing behavior). Inline is best for the common
  // "single-push from an app server" shape; large fan-outs benefit
  // from the queue's amortized cred load.
  if (rows.length <= INLINE_THRESHOLD) {
    // Re-fetch rows so dispatchOne sees the canonical inserted shape
    // (id, payloadJson, etc) without the route having to construct the
    // MessageRow type by hand.
    const inserted = await c.var.db
      .select()
      .from(messages)
      .where(inArray(messages.id, idByIndex));

    const outcomes = await inlineDispatchAppBatch(
      c.var.db,
      c.env,
      authedApp.appId,
      inserted,
    );

    const byId = new Map(outcomes.map((o) => [o.messageId, o]));
    const tickets: SendResponseItem[] = idByIndex.map((id) => {
      const out = byId.get(id);
      if (!out) {
        return { id, status: "ok", delivery: "queued" };
      }
      if (out.delivery === "delivered") {
        return { id, status: "ok", delivery: "delivered" };
      }
      if (out.delivery === "failed") {
        return {
          id,
          status: "ok",
          delivery: "failed",
          error: out.error,
          tokenInvalid: out.tokenInvalid,
        };
      }
      return { id, status: "ok", delivery: "queued" };
    });

    return c.json({ data: tickets });
  }

  // Large batch: queue path. Caller should poll receipts.
  const jobs: DispatchJob[] = idByIndex.map((id) => ({
    messageId: id,
    appId: authedApp.appId,
  }));
  await c.env.DISPATCH_QUEUE.sendBatch(jobs.map((body) => ({ body })));

  const tickets: SendResponseItem[] = idByIndex.map((id) => ({
    id,
    status: "ok",
    delivery: "queued",
  }));
  return c.json({ data: tickets });
});

function inferPlatform(token: string): "ios" | "android" {
  // APNs tokens are 64 hex chars. FCM tokens are typically longer and
  // contain non-hex characters (colons, underscores, dashes).
  if (/^[0-9a-f]{64}$/i.test(token)) return "ios";
  return "android";
}
