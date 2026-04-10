/**
 * Queue consumer that dispatches queued messages to APNs or FCM.
 *
 * Runs on batches of up to 100 jobs. For each job:
 *   1. Load the message row from D1
 *   2. Load the app's APNs or FCM credentials (decrypt on the fly)
 *   3. POST to APNs or FCM
 *   4. Update the message row with the result
 *
 * Queue retries: if dispatch throws, the message remains in the queue and
 * Cloudflare retries with exponential backoff up to max_retries.
 */

import { eq, inArray } from "drizzle-orm";

import type { PushMessage } from "@edgepush/shared";
import { createDb } from "./db";
import { apnsCredentials, fcmCredentials, messages } from "./db/schema";
import { decryptCredential } from "./lib/crypto";
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

  const apnsCreds = hasIos
    ? await loadApnsCredentials(db, env, appId)
    : null;
  const fcmCreds = hasAndroid ? await loadFcmCredentials(db, env, appId) : null;

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

    await db
      .update(messages)
      .set({
        status: result.ok ? "delivered" : "failed",
        error: result.error ?? null,
        tokenInvalid: result.tokenInvalid ?? false,
        updatedAt: Date.now(),
      })
      .where(eq(messages.id, row.id));

    job.ack();
  }
}

async function loadApnsCredentials(
  db: ReturnType<typeof createDb>,
  env: Env,
  appId: string,
) {
  const row = await db
    .select()
    .from(apnsCredentials)
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
