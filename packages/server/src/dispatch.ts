/**
 * Push dispatch.
 *
 * One core function (dispatchOne) does the actual APNs/FCM call, DB
 * write-back, and webhook fire. It's reused by:
 *
 *   - handleQueue (this file): batched queue consumer. Loads creds +
 *     webhook once per app per batch and runs dispatchOne per message.
 *   - inlineDispatch (./inline-dispatch.ts): synchronous /v1/send path
 *     that tries to deliver before the API responds. Falls back to
 *     enqueueing on transient failures.
 *
 * Queue retries: if dispatch throws, the message remains in the queue
 * and Cloudflare retries with exponential backoff up to max_retries.
 * APNs/FCM responses (including 4xx) are terminal, marked failed and
 * acked. The DLQ exists for the rare case where a thrown exception
 * burns through retries.
 */

import { eq, inArray } from "drizzle-orm";

import type { PushMessage } from "@edgepush/orpc";
import { createDb } from "./db";
import {
  apnsCredentials,
  apps,
  fcmCredentials,
  messages,
  webhooks,
} from "./db/schema";
import { decryptCredential } from "./lib/crypto";
import { logWorkerError } from "./lib/observability";
import { dispatchWebhook, type WebhookPayload } from "./lib/webhook";
import { dispatchApns } from "./push/apns";
import { dispatchFcm } from "./push/fcm";
import type { DispatchJob, Env } from "./types";

/** Resolved APNs credentials for an app. */
export type AppApnsCreds = NonNullable<
  Awaited<ReturnType<typeof loadApnsCredentials>>
>;

/** Resolved FCM credentials for an app. */
export type AppFcmCreds = NonNullable<
  Awaited<ReturnType<typeof loadFcmCredentials>>
>;

/** Webhook config row, or null if the app has none. */
export type AppWebhook = Awaited<ReturnType<typeof loadWebhook>>;

/** A single row from the messages table. */
type MessageRow = typeof messages.$inferSelect;

/** Outcome of dispatching one message. */
export type DispatchOutcome =
  | { kind: "delivered" }
  | { kind: "failed"; error: string; tokenInvalid: boolean };

/**
 * Dispatch one message. Updates the row to "sending", calls APNs/FCM,
 * writes back the terminal status, and fires a webhook (sync first
 * attempt + queue retry on failure).
 *
 * Throws on infrastructural errors (DB unreachable, decryption failed
 * via thrown exception). Callers in the queue path translate throws
 * into msg.retry(); the inline path translates them into "enqueue for
 * retry, return queued".
 */
export async function dispatchOne(
  db: ReturnType<typeof createDb>,
  env: Env,
  appId: string,
  row: MessageRow,
  apnsCreds: AppApnsCreds | null,
  fcmCreds: AppFcmCreds | null,
  webhook: AppWebhook,
): Promise<DispatchOutcome> {
  await db
    .update(messages)
    .set({ status: "sending", updatedAt: Date.now() })
    .where(eq(messages.id, row.id));

  let result: { ok: boolean; error?: string; tokenInvalid?: boolean };
  try {
    const payload = JSON.parse(row.payloadJson) as PushMessage;
    const isBroadcast = !!payload.topic || !!payload.condition;

    if (row.platform === "ios" && !isBroadcast) {
      if (!apnsCreds) {
        result = { ok: false, error: "APNs credentials not configured" };
      } else {
        result = await dispatchApns(apnsCreds, row.to, payload);
      }
    } else {
      if (!fcmCreds) {
        result = { ok: false, error: "FCM credentials not configured" };
      } else {
        const deviceToken = isBroadcast ? null : row.to;
        result = await dispatchFcm(fcmCreds, deviceToken, payload);
      }
    }
  } catch (err) {
    result = {
      ok: false,
      error: err instanceof Error ? err.message : "dispatch error",
    };
  }

  const nextStatus = result.ok ? "delivered" : "failed";
  await db
    .update(messages)
    .set({
      status: nextStatus,
      error: result.error ?? null,
      tokenInvalid: result.tokenInvalid ?? false,
      updatedAt: Date.now(),
    })
    .where(eq(messages.id, row.id));

  // Shadow-log non-token-invalid failures for the operator digest.
  if (!result.ok && !result.tokenInvalid) {
    await logWorkerError(db, {
      kind: "dispatch",
      payload: {
        appId,
        messageId: row.id,
        platform: row.platform,
        error: result.error ?? "unknown",
      },
    });
  }

  await fireWebhook(db, env, row.id, appId, webhook, {
    event: nextStatus === "delivered" ? "message.delivered" : "message.failed",
    messageId: row.id,
    appId,
    status: nextStatus,
    error: result.error ?? null,
    tokenInvalid: result.tokenInvalid ?? false,
    timestamp: Date.now(),
  });

  if (result.ok) return { kind: "delivered" };
  return {
    kind: "failed",
    error: result.error ?? "unknown",
    tokenInvalid: result.tokenInvalid ?? false,
  };
}

/**
 * Fire-and-forget webhook delivery: try once inline, queue for retry on
 * any failure (network or non-2xx). Extracted so both the queue
 * consumer and the inline path use identical webhook semantics.
 */
async function fireWebhook(
  db: ReturnType<typeof createDb>,
  env: Env,
  messageId: string,
  appId: string,
  webhook: AppWebhook,
  payload: WebhookPayload,
): Promise<void> {
  if (!webhook?.enabled) return;

  let firstAttemptOk = false;
  try {
    const r = await dispatchWebhook(webhook.url, webhook.secret, payload);
    firstAttemptOk = r.ok;
  } catch {
    // Network error on first attempt. Will enqueue for retry below.
  }
  if (firstAttemptOk) return;

  try {
    await env.WEBHOOK_QUEUE.send({
      url: webhook.url,
      secret: webhook.secret,
      payload,
      attempt: 1,
    });
  } catch (enqueueErr) {
    console.error(
      `[dispatch] webhook enqueue failed for ${messageId}:`,
      enqueueErr,
    );
    await logWorkerError(db, {
      kind: "webhook",
      payload: {
        messageId,
        appId,
        event: payload.event,
        url: webhook.url,
        reason: "enqueue_failed",
        error:
          enqueueErr instanceof Error ? enqueueErr.message : String(enqueueErr),
      },
    });
  }
}

/**
 * Queue consumer. Runs on batches of up to 100 jobs, groups by app to
 * amortize credential + webhook loads, then runs dispatchOne per
 * message. Throws → msg.retry(); APNs/FCM 4xx → marked failed + acked.
 */
export async function handleQueue(
  batch: MessageBatch<DispatchJob>,
  env: Env,
): Promise<void> {
  const db = createDb(env.DB);

  const byApp = new Map<string, Message<DispatchJob>[]>();
  for (const msg of batch.messages) {
    const existing = byApp.get(msg.body.appId);
    if (existing) {
      existing.push(msg);
    } else {
      byApp.set(msg.body.appId, [msg]);
    }
  }

  for (const [appId, jobs] of byApp) {
    try {
      await processAppBatch(db, env, appId, jobs);
    } catch (err) {
      const errorDetail = err instanceof Error ? err.message : String(err);
      console.error(
        `[dispatch] app ${appId} batch failed: ${errorDetail}`,
        err,
      );
      // Retry the whole group - individual jobs weren't acked
      for (const job of jobs) job.retry();
    }
  }
}

async function processAppBatch(
  db: ReturnType<typeof createDb>,
  env: Env,
  appId: string,
  jobs: Message<DispatchJob>[],
): Promise<void> {
  const messageIds = jobs.map((j) => j.body.messageId);
  const rows = await db
    .select()
    .from(messages)
    .where(inArray(messages.id, messageIds));
  const rowById = new Map(rows.map((r) => [r.id, r]));

  const hasIos = rows.some((r) => r.platform === "ios");
  const hasAndroid = rows.some((r) => r.platform === "android");
  const apnsCreds = hasIos ? await loadApnsCredentials(db, env, appId) : null;
  const fcmCreds = hasAndroid ? await loadFcmCredentials(db, env, appId) : null;
  const webhook = await loadWebhook(db, appId);

  for (const job of jobs) {
    const row = rowById.get(job.body.messageId);
    if (!row) {
      job.ack();
      continue;
    }
    try {
      await dispatchOne(db, env, appId, row, apnsCreds, fcmCreds, webhook);
      job.ack();
    } catch (err) {
      console.error(`[dispatch] threw for ${row.id}:`, err);
      job.retry();
    }
  }
}

export async function loadApnsCredentials(
  db: ReturnType<typeof createDb>,
  env: Env,
  appId: string,
) {
  // bundleId is derived from apps.packageName, not from the (deprecated)
  // apns_credentials.bundle_id column.
  const row = await db
    .select({
      keyId: apnsCredentials.keyId,
      teamId: apnsCredentials.teamId,
      privateKeyCiphertext: apnsCredentials.privateKeyCiphertext,
      privateKeyNonce: apnsCredentials.privateKeyNonce,
      production: apnsCredentials.production,
      bundleId: apps.packageName,
    })
    .from(apnsCredentials)
    .innerJoin(apps, eq(apps.id, apnsCredentials.appId))
    .where(eq(apnsCredentials.appId, appId))
    .limit(1)
    .then((rows) => rows[0] ?? null);
  if (!row) return null;

  const privateKey = await decryptCredential(
    {
      ciphertext: row.privateKeyCiphertext,
      nonce: row.privateKeyNonce,
    },
    env.ENCRYPTION_KEY,
  );

  return {
    keyId: row.keyId,
    teamId: row.teamId,
    bundleId: row.bundleId,
    privateKey,
    production: row.production,
  };
}

export async function loadFcmCredentials(
  db: ReturnType<typeof createDb>,
  env: Env,
  appId: string,
) {
  const row = await db
    .select()
    .from(fcmCredentials)
    .where(eq(fcmCredentials.appId, appId))
    .limit(1)
    .then((rows) => rows[0] ?? null);
  if (!row) return null;

  const serviceAccountJson = await decryptCredential(
    {
      ciphertext: row.serviceAccountCiphertext,
      nonce: row.serviceAccountNonce,
    },
    env.ENCRYPTION_KEY,
  );

  return {
    projectId: row.projectId,
    serviceAccountJson,
  };
}

export async function loadWebhook(
  db: ReturnType<typeof createDb>,
  appId: string,
) {
  return db
    .select()
    .from(webhooks)
    .where(eq(webhooks.appId, appId))
    .limit(1)
    .then((rows) => rows[0] ?? null);
}

/**
 * Dead-letter queue consumer. Logs each dead-letter to worker_errors
 * for the daily operator digest, then acks unconditionally.
 *
 * We deliberately do NOT re-run dispatch logic here. A message that
 * burned all retries against a healthy provider is telling us
 * something structural and operator intervention is the right
 * response. The replay-dlq.ts script exists for the rare case where
 * a transient outage buried good messages.
 */
export async function handleDlq(
  batch: MessageBatch<DispatchJob>,
  env: Env,
): Promise<void> {
  const db = createDb(env.DB);

  for (const msg of batch.messages) {
    await logWorkerError(db, {
      kind: "dlq",
      payload: {
        appId: msg.body.appId,
        messageId: msg.body.messageId,
        attempts: msg.attempts,
        timestamp: msg.timestamp.getTime(),
      },
    });
    msg.ack();
  }
}
