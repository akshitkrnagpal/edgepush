/**
 * Queue consumer that dispatches queued messages to APNs or FCM.
 *
 * Runs on batches of up to 100 jobs. For each job:
 *   1. Load the message row from D1
 *   2. Load the app's APNs or FCM credentials (decrypt on the fly)
 *   3. POST to APNs or FCM
 *   4. Update the message row with the result
 *   5. Fire a webhook if the app has one configured
 *
 * Queue retries: if dispatch throws, the message remains in the queue and
 * Cloudflare retries with exponential backoff up to max_retries.
 */

import { eq, inArray } from "drizzle-orm";

import type { PushMessage } from "@edgepush/shared";
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

export async function handleQueue(
  batch: MessageBatch<DispatchJob>,
  env: Env,
): Promise<void> {
  const db = createDb(env.DB);

  // Group by appId so we load credentials once per app per batch
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
      console.error(`[dispatch] app ${appId} batch failed:`, err);
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

  // Load creds lazily (only if we have iOS or Android messages)
  const hasIos = rows.some((r) => r.platform === "ios");
  const hasAndroid = rows.some((r) => r.platform === "android");

  const apnsCreds = hasIos ? await loadApnsCredentials(db, env, appId) : null;
  const fcmCreds = hasAndroid ? await loadFcmCredentials(db, env, appId) : null;

  // Load webhook once per batch (may be null if not configured)
  const webhook = await db
    .select()
    .from(webhooks)
    .where(eq(webhooks.appId, appId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  for (const job of jobs) {
    const row = rowById.get(job.body.messageId);
    if (!row) {
      job.ack();
      continue;
    }

    await db
      .update(messages)
      .set({ status: "sending", updatedAt: Date.now() })
      .where(eq(messages.id, row.id));

    let result: { ok: boolean; error?: string; tokenInvalid?: boolean };

    try {
      const payload = JSON.parse(row.payloadJson) as PushMessage;
      if (row.platform === "ios") {
        if (!apnsCreds) {
          result = { ok: false, error: "APNs credentials not configured" };
        } else {
          result = await dispatchApns(apnsCreds, row.to, payload);
        }
      } else {
        if (!fcmCreds) {
          result = { ok: false, error: "FCM credentials not configured" };
        } else {
          result = await dispatchFcm(fcmCreds, row.to, payload);
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

    // Shadow-log the failure for operator visibility. Does NOT change
    // retry semantics — the message has already been marked failed and
    // the queue will not re-dispatch. This exists so the daily digest
    // cron can surface patterns (many fails on one app, one device
    // token repeatedly invalid, etc.) that console.error would lose.
    //
    // Transient/token-invalid errors are noisy and expected, so we
    // only log the definitively-failed case where tokenInvalid is
    // false — those are the ones that hint at operator-level problems.
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

    // Fire webhook if configured and enabled.
    //
    // Failure handling: webhook failures don't block the push from being
    // acked (the delivery to APNs/FCM already happened, the webhook is a
    // separate observability channel). But they DO get logged to
    // worker_errors so the operator digest surfaces them.
    //
    // Followup: real retry semantics belong in a dedicated webhook queue
    // (separate from the push dispatch queue) so transient customer
    // outages don't get dropped on the first failure. For now, single
    // attempt + observability is the minimal correct behavior.
    if (webhook?.enabled) {
      const payload: WebhookPayload = {
        event: nextStatus === "delivered" ? "message.delivered" : "message.failed",
        messageId: row.id,
        appId,
        status: nextStatus,
        error: result.error ?? null,
        tokenInvalid: result.tokenInvalid ?? false,
        timestamp: Date.now(),
      };
      try {
        const webhookResult = await dispatchWebhook(
          webhook.url,
          webhook.secret,
          payload,
        );
        if (!webhookResult.ok) {
          await logWorkerError(db, {
            kind: "webhook",
            payload: {
              messageId: row.id,
              appId,
              event: payload.event,
              url: webhook.url,
              status: webhookResult.status,
              reason: "non_2xx",
            },
          });
        }
      } catch (err) {
        console.error(`[dispatch] webhook threw for ${row.id}:`, err);
        await logWorkerError(db, {
          kind: "webhook",
          payload: {
            messageId: row.id,
            appId,
            event: payload.event,
            url: webhook.url,
            reason: "threw",
            error: err instanceof Error ? err.message : String(err),
          },
        });
      }
    }

    job.ack();
  }
}

async function loadApnsCredentials(
  db: ReturnType<typeof createDb>,
  env: Env,
  appId: string,
) {
  // bundleId is derived from apps.packageName, not from the (deprecated)
  // apns_credentials.bundle_id column. This is the post-normalization
  // read path — one source of truth.
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

async function loadFcmCredentials(
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

/**
 * Dead-letter queue consumer.
 *
 * Cloudflare Queues retries a message `max_retries` times before sending
 * it to the dead-letter queue configured on the main consumer. This
 * handler picks those up, logs each one to `worker_errors` so the
 * daily operator digest will surface them, and acks so the DLQ drains.
 *
 * We deliberately DO NOT re-run dispatch logic here. A message that
 * failed 3 consecutive retries against a healthy provider is telling
 * us something structural (bad creds, bad payload, bad token) and
 * operator intervention is the right response. The replay-dlq.ts
 * operator script exists for the rare case where a transient outage
 * buried good messages.
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
    // Ack regardless — the DLQ is observability-only. If logging
    // failed, logWorkerError already swallowed the error. Retrying a
    // dead-letter just loops forever.
    msg.ack();
  }
}
