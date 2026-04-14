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
 *   4. Enqueue a dispatch job for each message.
 *   5. Return tickets (message ids) the caller can poll.
 */

import { Hono } from "hono";

import { SendRequestSchema, type SendResponseItem } from "@edgepush/orpc";
import { authenticateApiKey, authenticateSessionApp } from "../lib/auth";
import { generateId } from "../lib/crypto";
import { reserveMonthlyUsage } from "../lib/plan";
import type { RateLimiter } from "../rate-limiter";
import type { AppContext } from "../types";
import { messages } from "../db/schema";

/**
 * Kill switch KV key. If this key is set to ANY non-empty value, the
 * send handler returns 503 immediately, before auth, before any DB
 * read, before any downstream work. The operator can flip it in one
 * command:
 *
 *   wrangler kv:key put --binding=CACHE edgepush:killswitch:send "maintenance"
 *
 * And clear it just as fast:
 *
 *   wrangler kv:key delete --binding=CACHE edgepush:killswitch:send
 *
 * Intended for incident response, e.g., a bad deploy is corrupting
 * messages rows, pull the cord, ship the fix, release the cord. We
 * check KV on every request because KV reads from the nearest edge
 * cache are sub-millisecond; adding ~1ms of latency on the send path
 * is an acceptable price for a panic button.
 */
const KILLSWITCH_SEND_KEY = "edgepush:killswitch:send";

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
  const tickets: SendResponseItem[] = [];
  const jobs: { messageId: string; appId: string }[] = [];
  const rows: Array<typeof messages.$inferInsert> = [];

  for (const msg of msgs) {
    const id = generateId();

    // Determine target and platform. Topic/condition sends are always
    // Android (FCM-only). Token sends infer from format.
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

    jobs.push({ messageId: id, appId: authedApp.appId });
    tickets.push({ id, status: "ok" });
  }

  await c.var.db.insert(messages).values(rows);

  // Enqueue dispatch jobs in a single batch call
  if (jobs.length > 0) {
    await c.env.DISPATCH_QUEUE.sendBatch(
      jobs.map((job) => ({ body: job })),
    );
  }

  return c.json({ data: tickets });
});

function inferPlatform(token: string): "ios" | "android" {
  // APNs tokens are 64 hex chars. FCM tokens are typically longer and
  // contain non-hex characters (colons, underscores, dashes).
  if (/^[0-9a-f]{64}$/i.test(token)) return "ios";
  return "android";
}
