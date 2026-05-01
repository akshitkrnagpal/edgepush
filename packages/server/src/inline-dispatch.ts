/**
 * Synchronous dispatch path for /v1/send.
 *
 * Why: the queue-based path adds 1-5s of batching latency on a single
 * push (low traffic, max_batch_timeout=5). Calling APNs/FCM directly
 * from the API handler keeps device-perceived latency at one HTTPS
 * round-trip (~600-900ms total) when things are healthy, while
 * preserving queue-based retry for transient failures.
 *
 * Contract:
 *
 *   - One call dispatches one app's worth of just-inserted messages.
 *     Caller groups by app first.
 *
 *   - For each row, returns either delivered/failed (terminal) or
 *     queued (transient failure, dispatch job was enqueued for the
 *     queue consumer to retry).
 *
 *   - Throws nothing. Any unexpected error in cred loading or
 *     dispatchOne is converted into a "queued" outcome so the queue
 *     gets a second chance and the API call still succeeds.
 *
 * The caller (routes/send.ts) decides whether to use this path at all
 * based on batch size. Large fan-outs stay queue-only.
 */

import {
  dispatchOne,
  loadApnsCredentials,
  loadFcmCredentials,
  loadWebhook,
} from "./dispatch";
import type { createDb } from "./db";
import { messages } from "./db/schema";
import type { DispatchJob, Env } from "./types";

type MessageRow = typeof messages.$inferSelect;

/** Outcome reported back to the API handler per message. */
export type InlineOutcome =
  | { messageId: string; delivery: "delivered" }
  | {
      messageId: string;
      delivery: "failed";
      error: string;
      tokenInvalid: boolean;
    }
  | { messageId: string; delivery: "queued" };

/**
 * Dispatch a per-app batch of just-inserted messages inline. Anything
 * that fails to dispatch (network error, missing creds throw, etc.) is
 * enqueued onto DISPATCH_QUEUE so the queue consumer retries; that
 * message's outcome is "queued" rather than "failed".
 *
 * Both apnsCreds and fcmCreds are loaded lazily based on which
 * platforms are present in the batch, mirroring processAppBatch in the
 * queue consumer.
 */
export async function inlineDispatchAppBatch(
  db: ReturnType<typeof createDb>,
  env: Env,
  appId: string,
  rows: MessageRow[],
): Promise<InlineOutcome[]> {
  if (rows.length === 0) return [];

  const hasIos = rows.some((r) => r.platform === "ios");
  const hasAndroid = rows.some((r) => r.platform === "android");

  let apnsCreds: Awaited<ReturnType<typeof loadApnsCredentials>> = null;
  let fcmCreds: Awaited<ReturnType<typeof loadFcmCredentials>> = null;
  let webhook: Awaited<ReturnType<typeof loadWebhook>> = null;

  try {
    [apnsCreds, fcmCreds, webhook] = await Promise.all([
      hasIos ? loadApnsCredentials(db, env, appId) : Promise.resolve(null),
      hasAndroid ? loadFcmCredentials(db, env, appId) : Promise.resolve(null),
      loadWebhook(db, appId),
    ]);
  } catch (err) {
    // Cred loading itself failed (decryption, DB hiccup). Defer the
    // whole batch to the queue rather than mark every message failed.
    console.error(`[inline-dispatch] cred load failed for ${appId}:`, err);
    return enqueueAll(env, appId, rows);
  }

  // Dispatch concurrently. APNs/FCM both use HTTP/2 multiplexing so
  // small concurrent fan-out is fine; a per-app batch large enough to
  // saturate either provider will already be over the inline threshold
  // and routed to the queue by the caller.
  const outcomes = await Promise.all(
    rows.map((row) =>
      dispatchOne(db, env, appId, row, apnsCreds, fcmCreds, webhook).then(
        (out): InlineOutcome =>
          out.kind === "delivered"
            ? { messageId: row.id, delivery: "delivered" }
            : {
                messageId: row.id,
                delivery: "failed",
                error: out.error,
                tokenInvalid: out.tokenInvalid,
              },
        async (err): Promise<InlineOutcome> => {
          // Network blip / unexpected throw inside dispatchOne. Defer
          // this specific message to the queue.
          console.error(`[inline-dispatch] threw for ${row.id}:`, err);
          await safeEnqueue(env, appId, row.id);
          return { messageId: row.id, delivery: "queued" };
        },
      ),
    ),
  );

  return outcomes;
}

/**
 * Defer every row to the queue. Used when cred loading itself fails;
 * the queue consumer will retry under the queue's exponential backoff
 * and the API responds with "queued" for each message.
 */
async function enqueueAll(
  env: Env,
  appId: string,
  rows: MessageRow[],
): Promise<InlineOutcome[]> {
  try {
    await env.DISPATCH_QUEUE.sendBatch(
      rows.map((row) => ({
        body: { messageId: row.id, appId } satisfies DispatchJob,
      })),
    );
  } catch (err) {
    // Even enqueue failed. Nothing more we can do here; the rows are
    // marked "queued" in the DB and the caller will see "queued" too.
    // Operator will notice via missing dispatch heartbeat.
    console.error(`[inline-dispatch] enqueue-all failed for ${appId}:`, err);
  }
  return rows.map((row) => ({ messageId: row.id, delivery: "queued" }));
}

async function safeEnqueue(
  env: Env,
  appId: string,
  messageId: string,
): Promise<void> {
  try {
    await env.DISPATCH_QUEUE.send({ messageId, appId } satisfies DispatchJob);
  } catch (err) {
    console.error(
      `[inline-dispatch] enqueue failed for ${messageId}:`,
      err,
    );
  }
}
