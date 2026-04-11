/**
 * Scheduled (cron) entrypoint for edgepush.
 *
 * This file is the dispatch table for every cron trigger defined in
 * wrangler.jsonc. Workers with multiple crons share a single `scheduled()`
 * export that fans out based on `event.cron`.
 *
 * ┌───────────────────┬─────────────────────────────────────────────────┐
 * │ cron expression   │ handler                                         │
 * ├───────────────────┼─────────────────────────────────────────────────┤
 * │ 0 * * * *         │ runProbeCycle — credential health probes        │
 * │ (future)          │ runRetentionPurge, runErrorDigest, runBackup    │
 * └───────────────────┴─────────────────────────────────────────────────┘
 *
 * v1 ships only the credential health probe cron. Other crons land in
 * their own phases.
 *
 * Concurrency model: each scheduled() invocation calls exactly one
 * handler. Inside a handler, work is done sequentially or with a small
 * parallelism cap (see PROBE_CONCURRENCY). Workers' scheduled handlers
 * have a hard CPU budget (~30s on the paid plan), so long-running work
 * must be chunked and the next tick picks up where we left off.
 */

import { desc, eq, gte, isNull, lt, or, and, inArray, sql } from "drizzle-orm";

import { createDb } from "./db";
import type { Db } from "./db";
import {
  apnsCredentials,
  apps,
  fcmCredentials,
  user,
  workerErrors,
} from "./db/schema";
import { decryptCredential } from "./lib/crypto";
import { sendEmail } from "./lib/email";
import { isHosted } from "./lib/mode";
import { probeApnsCredentials } from "./probes/apns";
import { probeFcmCredentials } from "./probes/fcm";
import type { ProbeResult, ProbeState } from "./probes/types";
import type { Env } from "./types";

/**
 * How many credentials to probe in parallel. APNs is served from a shared
 * Cloudflare egress IP pool, so aggressive concurrency is a good way to
 * get shadow-banned by Apple. Keep this low. Bump only after observing
 * real throttling signals in production.
 */
const PROBE_CONCURRENCY = 5;

/** 24h, 6h in milliseconds. */
const HEALTHY_CADENCE_MS = 24 * 60 * 60 * 1000;
const BROKEN_CADENCE_MS = 6 * 60 * 60 * 1000;

/** Email dedup: don't alert the same user about the same credential more than once per week. */
const ALERT_DEDUP_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Top-level cron dispatcher. Called from the default export in index.ts.
 * Fans out by `event.cron`. Unknown cron strings are logged and ignored
 * so a misconfigured wrangler.jsonc doesn't crash the scheduled slot.
 */
export async function handleScheduled(
  event: ScheduledEvent,
  env: Env,
): Promise<void> {
  switch (event.cron) {
    case "0 * * * *":
      await runProbeCycle(env);
      return;
    case "0 3 * * *":
      await runOperatorDigest(env);
      return;
    default:
      console.warn(`[cron] unknown cron "${event.cron}" — no handler wired`);
  }
}

// ----- Operator digest cron -----

/**
 * Daily 03:00 UTC operator digest.
 *
 *   1. Count worker_errors rows from the last 24h, grouped by kind.
 *   2. Check D1 size via PRAGMA — alert if > 7 GB (of the 10 GB hard cap).
 *   3. If anything is worth reporting, email OPERATOR_EMAIL with a
 *      plain-text summary.
 *
 * "Worth reporting" = either at least one worker_errors row OR D1 is
 * past the 7 GB warning threshold. A clean 24h is silent — we don't
 * want to train the operator to ignore the digest.
 *
 * If OPERATOR_EMAIL is unset we log to console.warn and skip sending.
 * That's fine on self-host; production operators set the env var.
 */
export async function runOperatorDigest(env: Env): Promise<void> {
  const db = createDb(env.DB);
  const now = Date.now();
  const since = now - 24 * 60 * 60 * 1000;

  // Pull recent errors. We group in-memory rather than via SQL because
  // D1's SQLite doesn't have rich GROUP BY in the drizzle query builder
  // and for v1 volume (a few hundred rows max per day) this is fine.
  const recent = await db
    .select({
      id: workerErrors.id,
      kind: workerErrors.kind,
      payload: workerErrors.payload,
      createdAt: workerErrors.createdAt,
    })
    .from(workerErrors)
    .where(gte(workerErrors.createdAt, since))
    .orderBy(desc(workerErrors.createdAt))
    .limit(500);

  const byKind = new Map<string, number>();
  for (const row of recent) {
    byKind.set(row.kind, (byKind.get(row.kind) ?? 0) + 1);
  }

  // D1 size check — PRAGMA page_count + PRAGMA page_size. Drizzle
  // doesn't have a first-class helper for pragmas; use raw SQL.
  let dbSizeBytes: number | null = null;
  try {
    const pageCountRow = await env.DB.prepare("PRAGMA page_count").first<
      { page_count: number }
    >();
    const pageSizeRow = await env.DB.prepare("PRAGMA page_size").first<
      { page_size: number }
    >();
    if (pageCountRow && pageSizeRow) {
      dbSizeBytes =
        (pageCountRow.page_count ?? 0) * (pageSizeRow.page_size ?? 0);
    }
  } catch (err) {
    console.warn("[cron] D1 size check failed:", err);
  }

  const WARN_BYTES = 7 * 1024 * 1024 * 1024; // 7 GB
  const d1OverWarning = dbSizeBytes != null && dbSizeBytes > WARN_BYTES;

  const shouldReport = recent.length > 0 || d1OverWarning;
  if (!shouldReport) {
    // Clean day — silence is intentional.
    return;
  }

  if (!env.OPERATOR_EMAIL) {
    console.warn(
      `[cron] operator digest has ${recent.length} worker_errors rows and d1SizeBytes=${dbSizeBytes}, but OPERATOR_EMAIL is not set — skipping email`,
    );
    return;
  }

  // Build the plain-text body. Keeping it text-only so the operator
  // can read it from a terminal mail client. No HTML variant.
  const lines: string[] = [];
  lines.push(`edgepush daily digest — ${new Date(now).toISOString()}`);
  lines.push("");

  if (recent.length > 0) {
    lines.push(`worker_errors in last 24h: ${recent.length}`);
    const sorted = [...byKind.entries()].sort((a, b) => b[1] - a[1]);
    for (const [kind, count] of sorted) {
      lines.push(`  ${kind.padEnd(12)} ${count}`);
    }
    lines.push("");
    lines.push("most recent 5:");
    for (const row of recent.slice(0, 5)) {
      const when = new Date(row.createdAt).toISOString();
      lines.push(`  ${when}  ${row.kind}`);
      if (row.payload) {
        const truncated =
          row.payload.length > 200
            ? row.payload.slice(0, 200) + "..."
            : row.payload;
        lines.push(`    ${truncated}`);
      }
    }
    lines.push("");
  }

  if (d1OverWarning) {
    const gb = ((dbSizeBytes ?? 0) / (1024 * 1024 * 1024)).toFixed(2);
    lines.push(`⚠ D1 size: ${gb} GB (over 7 GB warning, 10 GB cap)`);
    lines.push("  — consider running retention purge manually or bumping retention");
    lines.push("");
  } else if (dbSizeBytes != null) {
    const gb = (dbSizeBytes / (1024 * 1024 * 1024)).toFixed(2);
    lines.push(`D1 size: ${gb} GB / 10 GB cap (ok)`);
    lines.push("");
  }

  lines.push("— edgepush operator digest");

  try {
    await sendEmail(env, {
      to: env.OPERATOR_EMAIL,
      subject: `[edgepush] daily digest — ${recent.length} errors${d1OverWarning ? " + d1 warning" : ""}`,
      text: lines.join("\n"),
    });
  } catch (err) {
    console.error("[cron] operator digest email failed:", err);
  }
}

/**
 * One tick of the credential health probe. Selects credentials that are
 * due for a check, runs APNs and FCM probes against them with limited
 * concurrency, writes the results back, and emails users whose creds
 * newly transitioned to broken.
 */
export async function runProbeCycle(env: Env): Promise<void> {
  const db = createDb(env.DB);
  const now = Date.now();

  // Fetch all APNs credentials that are due for a check. "Due" means:
  //   - never checked (last_checked_at IS NULL), or
  //   - last was OK and >= 24h ago, or
  //   - last was BROKEN and >= 6h ago.
  // We fetch a generous batch and let the concurrency cap rate-limit the
  // work. For v1 scale (<100 credentials), this is plenty.
  const dueApnsRows = await db
    .select({
      appId: apnsCredentials.appId,
      keyId: apnsCredentials.keyId,
      teamId: apnsCredentials.teamId,
      privateKeyCiphertext: apnsCredentials.privateKeyCiphertext,
      privateKeyNonce: apnsCredentials.privateKeyNonce,
      production: apnsCredentials.production,
      lastCheckedAt: apnsCredentials.lastCheckedAt,
      lastCheckOk: apnsCredentials.lastCheckOk,
      alertSentAt: apnsCredentials.alertSentAt,
      bundleId: apps.packageName,
      userId: apps.userId,
    })
    .from(apnsCredentials)
    .innerJoin(apps, eq(apps.id, apnsCredentials.appId))
    .where(
      or(
        isNull(apnsCredentials.lastCheckedAt),
        and(
          eq(apnsCredentials.lastCheckOk, true),
          lt(apnsCredentials.lastCheckedAt, now - HEALTHY_CADENCE_MS),
        ),
        and(
          eq(apnsCredentials.lastCheckOk, false),
          lt(apnsCredentials.lastCheckedAt, now - BROKEN_CADENCE_MS),
        ),
      ),
    )
    .limit(200);

  const dueFcmRows = await db
    .select({
      appId: fcmCredentials.appId,
      projectId: fcmCredentials.projectId,
      serviceAccountCiphertext: fcmCredentials.serviceAccountCiphertext,
      serviceAccountNonce: fcmCredentials.serviceAccountNonce,
      lastCheckedAt: fcmCredentials.lastCheckedAt,
      lastCheckOk: fcmCredentials.lastCheckOk,
      alertSentAt: fcmCredentials.alertSentAt,
      userId: apps.userId,
    })
    .from(fcmCredentials)
    .innerJoin(apps, eq(apps.id, fcmCredentials.appId))
    .where(
      or(
        isNull(fcmCredentials.lastCheckedAt),
        and(
          eq(fcmCredentials.lastCheckOk, true),
          lt(fcmCredentials.lastCheckedAt, now - HEALTHY_CADENCE_MS),
        ),
        and(
          eq(fcmCredentials.lastCheckOk, false),
          lt(fcmCredentials.lastCheckedAt, now - BROKEN_CADENCE_MS),
        ),
      ),
    )
    .limit(200);

  if (dueApnsRows.length === 0 && dueFcmRows.length === 0) {
    return;
  }

  // Collect unique user IDs so we can look up emails for alerts in one
  // round trip, not one per broken credential.
  const userIds = new Set<string>();
  for (const row of dueApnsRows) userIds.add(row.userId);
  for (const row of dueFcmRows) userIds.add(row.userId);
  const userEmailByUserId = new Map<string, string>();
  if (userIds.size > 0) {
    const users = await db
      .select({ id: user.id, email: user.email })
      .from(user)
      .where(inArray(user.id, [...userIds]));
    for (const u of users) userEmailByUserId.set(u.id, u.email);
  }

  // Run probes with a small concurrency cap. No fancy scheduler — just
  // chunk the work into groups of PROBE_CONCURRENCY and await each group.
  const apnsResults = await probeBatch(dueApnsRows, PROBE_CONCURRENCY, async (row) => {
    try {
      const privateKey = await decryptCredential(
        {
          ciphertext: row.privateKeyCiphertext,
          nonce: row.privateKeyNonce,
        },
        env.ENCRYPTION_KEY,
      );
      return probeApnsCredentials({
        keyId: row.keyId,
        teamId: row.teamId,
        privateKey,
        bundleId: row.bundleId,
        production: row.production,
      });
    } catch (err) {
      const error = err instanceof Error ? err.message : "unknown error";
      return {
        state: "broken" as const,
        error: `could not decrypt stored .p8 key: ${error}`,
      };
    }
  });

  const fcmResults = await probeBatch(dueFcmRows, PROBE_CONCURRENCY, async (row) => {
    try {
      const serviceAccountJson = await decryptCredential(
        {
          ciphertext: row.serviceAccountCiphertext,
          nonce: row.serviceAccountNonce,
        },
        env.ENCRYPTION_KEY,
      );
      return probeFcmCredentials({
        serviceAccountJson,
        projectId: row.projectId,
      });
    } catch (err) {
      const error = err instanceof Error ? err.message : "unknown error";
      return {
        state: "broken" as const,
        error: `could not decrypt stored service account: ${error}`,
      };
    }
  });

  // Write results back and collect transitions that need alerts.
  for (let i = 0; i < dueApnsRows.length; i++) {
    const row = dueApnsRows[i]!;
    const result = apnsResults[i]!;
    await writeApnsResult(db, row.appId, result, now);

    if (shouldEmail(result.state, row.alertSentAt, now)) {
      const email = userEmailByUserId.get(row.userId);
      if (email) {
        await notifyBrokenApns(env, email, row.appId, row.bundleId, result).catch(
          (err) => {
            console.error(`[probe/apns] email failed for ${row.appId}:`, err);
          },
        );
        await db
          .update(apnsCredentials)
          .set({ alertSentAt: now })
          .where(eq(apnsCredentials.appId, row.appId));
      }
    }
  }

  for (let i = 0; i < dueFcmRows.length; i++) {
    const row = dueFcmRows[i]!;
    const result = fcmResults[i]!;
    await writeFcmResult(db, row.appId, result, now);

    if (shouldEmail(result.state, row.alertSentAt, now)) {
      const email = userEmailByUserId.get(row.userId);
      if (email) {
        await notifyBrokenFcm(env, email, row.appId, row.projectId, result).catch(
          (err) => {
            console.error(`[probe/fcm] email failed for ${row.appId}:`, err);
          },
        );
        await db
          .update(fcmCredentials)
          .set({ alertSentAt: now })
          .where(eq(fcmCredentials.appId, row.appId));
      }
    }
  }

  // On self-host, we still run the probe (it's useful!) but we don't
  // need to be shy about it — there's nothing to charge for and nothing
  // to rate-limit beyond the concurrency cap above. Log a marker so
  // self-host operators can grep for "probe cycle" in their logs.
  if (!isHosted(env)) {
    console.log(
      `[probe] self-host cycle complete — apns=${dueApnsRows.length} fcm=${dueFcmRows.length}`,
    );
  }
}

/**
 * Transient results don't flip the stored state — they leave last_check_ok
 * untouched so the dashboard keeps showing the last known value. OK and
 * broken flip the state and bump last_checked_at so the cadence window
 * moves forward.
 */
async function writeApnsResult(
  db: Db,
  appId: string,
  result: ProbeResult,
  now: number,
): Promise<void> {
  if (result.state === "transient") {
    // Touch last_checked_at so we don't retry on the next tick, but leave
    // last_check_ok / last_check_error alone. Back-off logic.
    await db
      .update(apnsCredentials)
      .set({ lastCheckedAt: now })
      .where(eq(apnsCredentials.appId, appId));
    return;
  }

  const ok = result.state === "ok";
  await db
    .update(apnsCredentials)
    .set({
      lastCheckedAt: now,
      lastCheckOk: ok,
      lastCheckError: ok ? null : result.error,
    })
    .where(eq(apnsCredentials.appId, appId));
}

async function writeFcmResult(
  db: Db,
  appId: string,
  result: ProbeResult,
  now: number,
): Promise<void> {
  if (result.state === "transient") {
    await db
      .update(fcmCredentials)
      .set({ lastCheckedAt: now })
      .where(eq(fcmCredentials.appId, appId));
    return;
  }

  const ok = result.state === "ok";
  await db
    .update(fcmCredentials)
    .set({
      lastCheckedAt: now,
      lastCheckOk: ok,
      lastCheckError: ok ? null : result.error,
    })
    .where(eq(fcmCredentials.appId, appId));
}

/**
 * Email eligibility check. We email when:
 *   - the probe result is "broken" (NOT topic_mismatch — that's a config
 *     issue and surfaces in the dashboard only)
 *   - we haven't already emailed this credential within ALERT_DEDUP_MS
 */
function shouldEmail(
  state: ProbeState,
  alertSentAt: number | null,
  now: number,
): boolean {
  if (state !== "broken") return false;
  if (alertSentAt === null) return true;
  return now - alertSentAt >= ALERT_DEDUP_MS;
}

async function notifyBrokenApns(
  env: Env,
  to: string,
  appId: string,
  bundleId: string,
  result: ProbeResult,
): Promise<void> {
  const subject = `[edgepush] APNs credential for ${bundleId} is broken`;
  const text = [
    `Your edgepush APNs credential failed its last health check.`,
    ``,
    `App ID:    ${appId}`,
    `Bundle ID: ${bundleId}`,
    ``,
    `What Apple told us:`,
    `  ${result.error}`,
    ``,
    `Until this is fixed, pushes to this app's iOS devices will fail.`,
    ``,
    `To fix:`,
    `  1. Open your edgepush dashboard for this app`,
    `  2. Go to Credentials > APNs`,
    `  3. Upload a fresh .p8 key from the Apple Developer portal`,
    ``,
    `edgepush — open source push notifications`,
  ].join("\n");

  await sendEmail(env, { to, subject, text });
}

async function notifyBrokenFcm(
  env: Env,
  to: string,
  appId: string,
  projectId: string,
  result: ProbeResult,
): Promise<void> {
  const subject = `[edgepush] FCM credential for ${projectId} is broken`;
  const text = [
    `Your edgepush FCM credential failed its last health check.`,
    ``,
    `App ID:     ${appId}`,
    `Project ID: ${projectId}`,
    ``,
    `What FCM told us:`,
    `  ${result.error}`,
    ``,
    `Until this is fixed, pushes to this app's Android devices will fail.`,
    ``,
    `To fix:`,
    `  1. Open your edgepush dashboard for this app`,
    `  2. Go to Credentials > FCM`,
    `  3. Upload a fresh service account JSON from Firebase Console`,
    `     (or restore the cloudmessaging.messages:create role if you revoked it)`,
    ``,
    `edgepush — open source push notifications`,
  ].join("\n");

  await sendEmail(env, { to, subject, text });
}

/**
 * Run `worker` over each item in `items` with at most `concurrency`
 * in-flight at a time. Results come back in the original order. No fancy
 * scheduler — just sequential chunks.
 */
async function probeBatch<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  for (let start = 0; start < items.length; start += concurrency) {
    const chunk = items.slice(start, start + concurrency);
    const chunkResults = await Promise.all(chunk.map(worker));
    for (let i = 0; i < chunkResults.length; i++) {
      results[start + i] = chunkResults[i]!;
    }
  }
  return results;
}
