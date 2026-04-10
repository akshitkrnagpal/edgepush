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

import { SendRequestSchema, type SendResponseItem } from "@edgepush/shared";
import { authenticateApiKey } from "../lib/auth";
import { generateId } from "../lib/crypto";
import type { RateLimiter } from "../rate-limiter";
import type { AppContext } from "../types";
import { messages } from "../db/schema";

export const sendRouter = new Hono<AppContext>();

sendRouter.post("/send", async (c) => {
  const authedApp = await authenticateApiKey(
    c.var.db,
    c.req.header("authorization") ?? null,
  );
  if (!authedApp) {
    return c.json({ error: "invalid_api_key" }, 401);
  }

  // Rate limit by app
  const limiterId = c.env.RATE_LIMITER.idFromName(authedApp.appId);
  const limiter = c.env.RATE_LIMITER.get(
    limiterId,
  ) as unknown as DurableObjectStub<RateLimiter>;

  const parseResult = SendRequestSchema.safeParse(await c.req.json());
  if (!parseResult.success) {
    return c.json(
      { error: "invalid_request", issues: parseResult.error.issues },
      400,
    );
  }
  const { messages: msgs } = parseResult.data;

  const rateLimit = await limiter.take(msgs.length);
  if (!rateLimit.allowed) {
    return c.json(
      { error: "rate_limited", retry_after_ms: rateLimit.retryAfterMs },
      429,
    );
  }

  const now = Date.now();
  const tickets: SendResponseItem[] = [];
  const jobs: { messageId: string; appId: string }[] = [];
  const rows: Array<typeof messages.$inferInsert> = [];

  for (const msg of msgs) {
    const id = generateId();
    const platform = msg.platform ?? inferPlatform(msg.to);

    rows.push({
      id,
      appId: authedApp.appId,
      to: msg.to,
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
