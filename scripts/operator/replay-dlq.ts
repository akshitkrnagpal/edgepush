#!/usr/bin/env bun
/**
 * Operator script, re-enqueue a dead-lettered message.
 *
 * When a message ends up in the DLQ, the dispatch consumer has given
 * up after max_retries. The daily operator digest surfaces the
 * dead-letter via `worker_errors` rows with kind='dlq'. If the
 * operator determines the root cause was transient (e.g., APNs 5xx
 * storm, now resolved), this script re-enqueues the message so the
 * main consumer tries again.
 *
 * Usage:
 *
 *   bun scripts/operator/replay-dlq.ts <appId> <messageId> [--remote]
 *
 * Behaviour:
 *   1. Verifies the messages row still exists and belongs to the app.
 *   2. Resets status to 'queued', clears error, bumps updatedAt.
 *   3. Sends a new dispatch job to the main queue via wrangler.
 *
 * Runs LOCALLY with the operator's wrangler auth. Does not execute
 * inside the Worker. Uses `wrangler d1 execute` and
 * `wrangler queues producer publish` under the hood.
 *
 * Add `--remote` to operate against the production D1 + queue. Omit
 * for the local development DB.
 */

import { execSync } from "node:child_process";

const args = process.argv.slice(2);
const remote = args.includes("--remote");
const positional = args.filter((a) => !a.startsWith("--"));

if (positional.length !== 2) {
  console.error(
    "usage: bun scripts/operator/replay-dlq.ts <appId> <messageId> [--remote]",
  );
  process.exit(1);
}

const [appId, messageId] = positional as [string, string];
const scope = remote ? "--remote" : "--local";
const binding = "edgepush";

console.log(`[replay-dlq] app=${appId} message=${messageId} scope=${scope}`);

// Step 1: verify the message exists and belongs to the claimed app.
const selectSql = `SELECT id, status, error FROM messages WHERE id = '${messageId}' AND app_id = '${appId}' LIMIT 1;`;
let existing: { id: string; status: string; error: string | null } | null =
  null;
try {
  const raw = execSync(
    `wrangler d1 execute ${binding} ${scope} --json --command ${JSON.stringify(selectSql)}`,
    { stdio: ["ignore", "pipe", "inherit"] },
  ).toString();
  const parsed = JSON.parse(raw) as Array<{
    results: Array<{ id: string; status: string; error: string | null }>;
  }>;
  existing = parsed[0]?.results?.[0] ?? null;
} catch (err) {
  console.error("[replay-dlq] select failed:", err);
  process.exit(1);
}

if (!existing) {
  console.error(
    `[replay-dlq] no messages row with id=${messageId} appId=${appId}`,
  );
  process.exit(1);
}

console.log(
  `[replay-dlq] found row: status=${existing.status} error=${existing.error ?? "(none)"}`,
);

// Step 2: reset status to queued so the dispatch consumer picks it up.
const updateSql = `UPDATE messages SET status = 'queued', error = NULL, updated_at = ${Date.now()} WHERE id = '${messageId}' AND app_id = '${appId}';`;
try {
  execSync(
    `wrangler d1 execute ${binding} ${scope} --command ${JSON.stringify(updateSql)}`,
    { stdio: ["ignore", "pipe", "inherit"] },
  );
  console.log("[replay-dlq] row reset to queued");
} catch (err) {
  console.error("[replay-dlq] update failed:", err);
  process.exit(1);
}

// Step 3: publish a new dispatch job to the main queue.
// Wrangler 4 exposes `wrangler queues producer publish <queue> --message=<json>`
// for one-off publishes. The message shape must match DispatchJob in
// apps/api/src/types.ts.
const jobBody = JSON.stringify({ messageId, appId });
try {
  execSync(
    `wrangler queues producer publish edgepush-dispatch ${scope} --message=${JSON.stringify(jobBody)}`,
    { stdio: ["ignore", "pipe", "inherit"] },
  );
  console.log(
    `[replay-dlq] re-enqueued to edgepush-dispatch, check Recent Deliveries in ~5s`,
  );
} catch (err) {
  console.error("[replay-dlq] queue publish failed:", err);
  console.error(
    "[replay-dlq] the messages row has been reset, but the job did NOT re-enter the queue.",
  );
  console.error(
    "[replay-dlq] re-run: wrangler queues producer publish edgepush-dispatch " +
      scope +
      ` --message='${jobBody}'`,
  );
  process.exit(1);
}

console.log("[replay-dlq] done");
