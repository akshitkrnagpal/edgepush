#!/usr/bin/env bun
/**
 * Operator script, inspect a single app's recent activity.
 *
 * Purpose: when a paying customer emails saying "my pushes aren't
 * landing," run this script to pull their last 50 messages, their
 * credential health state, and any worker_errors tagged with their
 * appId from the last 24h. Paste the output into the support email.
 *
 * Usage:
 *
 *   bun scripts/operator/inspect-app.ts <appId> [--remote]
 *
 * Runs locally with the operator's wrangler auth. Does not require a
 * session cookie and does not go through the API, reads straight
 * from D1 via `wrangler d1 execute`.
 */

import { execSync } from "node:child_process";

const args = process.argv.slice(2);
const remote = args.includes("--remote");
const positional = args.filter((a) => !a.startsWith("--"));

if (positional.length !== 1) {
  console.error(
    "usage: bun scripts/operator/inspect-app.ts <appId> [--remote]",
  );
  process.exit(1);
}

const [appId] = positional as [string];
const scope = remote ? "--remote" : "--local";
const binding = "edgepush";

function run<T = unknown>(sql: string): T[] {
  const raw = execSync(
    `wrangler d1 execute ${binding} ${scope} --json --command ${JSON.stringify(sql)}`,
    { stdio: ["ignore", "pipe", "inherit"] },
  ).toString();
  const parsed = JSON.parse(raw) as Array<{ results: T[] }>;
  return parsed[0]?.results ?? [];
}

console.log(`[inspect] app=${appId} scope=${scope}`);
console.log("");

// --- App metadata + owner ---
const appRows = run<{
  id: string;
  name: string;
  package_name: string;
  user_id: string;
  created_at: number;
}>(
  `SELECT id, name, package_name, user_id, created_at FROM apps WHERE id = '${appId}' LIMIT 1;`,
);
if (appRows.length === 0) {
  console.error(`[inspect] no app found with id=${appId}`);
  process.exit(1);
}
const app = appRows[0]!;
console.log("── app ──────────────────────────────");
console.log(`  name          ${app.name}`);
console.log(`  package_name  ${app.package_name}`);
console.log(`  user_id       ${app.user_id}`);
console.log(`  created_at    ${new Date(app.created_at).toISOString()}`);
console.log("");

// --- Owner ---
const userRows = run<{ email: string; name: string }>(
  `SELECT email, name FROM user WHERE id = '${app.user_id}' LIMIT 1;`,
);
if (userRows.length > 0) {
  console.log("── owner ────────────────────────────");
  console.log(`  email  ${userRows[0]!.email}`);
  console.log(`  name   ${userRows[0]!.name}`);
  console.log("");
}

// --- Subscription (if hosted) ---
const subRows = run<{
  plan: string;
  status: string;
  current_period_end: number | null;
}>(
  `SELECT plan, status, current_period_end FROM subscriptions WHERE user_id = '${app.user_id}' LIMIT 1;`,
);
if (subRows.length > 0) {
  console.log("── subscription ─────────────────────");
  console.log(`  plan    ${subRows[0]!.plan}`);
  console.log(`  status  ${subRows[0]!.status}`);
  const end = subRows[0]!.current_period_end;
  console.log(
    `  period  ${end ? new Date(end).toISOString() : "(none)"}`,
  );
  console.log("");
}

// --- Credential health ---
const apnsHealth = run<{
  last_checked_at: number | null;
  last_check_ok: number | null;
  last_check_error: string | null;
}>(
  `SELECT last_checked_at, last_check_ok, last_check_error FROM apns_credentials WHERE app_id = '${appId}' LIMIT 1;`,
);
const fcmHealth = run<{
  last_checked_at: number | null;
  last_check_ok: number | null;
  last_check_error: string | null;
}>(
  `SELECT last_checked_at, last_check_ok, last_check_error FROM fcm_credentials WHERE app_id = '${appId}' LIMIT 1;`,
);
if (apnsHealth.length > 0 || fcmHealth.length > 0) {
  console.log("── credential health ────────────────");
  if (apnsHealth.length > 0) {
    const h = apnsHealth[0]!;
    const status =
      h.last_check_ok == null
        ? "never probed"
        : h.last_check_ok
          ? "ok"
          : "BROKEN";
    console.log(
      `  apns  ${status}  ${h.last_checked_at ? new Date(h.last_checked_at).toISOString() : "-"}`,
    );
    if (h.last_check_error) console.log(`        ${h.last_check_error}`);
  }
  if (fcmHealth.length > 0) {
    const h = fcmHealth[0]!;
    const status =
      h.last_check_ok == null
        ? "never probed"
        : h.last_check_ok
          ? "ok"
          : "BROKEN";
    console.log(
      `  fcm   ${status}  ${h.last_checked_at ? new Date(h.last_checked_at).toISOString() : "-"}`,
    );
    if (h.last_check_error) console.log(`        ${h.last_check_error}`);
  }
  console.log("");
}

// --- Last 20 messages ---
const messageRows = run<{
  id: string;
  platform: string;
  status: string;
  error: string | null;
  created_at: number;
}>(
  `SELECT id, platform, status, error, created_at FROM messages WHERE app_id = '${appId}' ORDER BY created_at DESC LIMIT 20;`,
);
console.log("── last 20 messages ─────────────────");
if (messageRows.length === 0) {
  console.log("  (none)");
} else {
  for (const m of messageRows) {
    const when = new Date(m.created_at).toISOString();
    const err = m.error ? `, ${m.error.slice(0, 60)}` : "";
    console.log(
      `  ${when}  ${m.platform.padEnd(8)}  ${m.status.padEnd(10)}  ${m.id.slice(0, 8)}${err}`,
    );
  }
}
console.log("");

// --- Recent worker_errors for this app ---
const errorRows = run<{
  id: string;
  kind: string;
  payload: string | null;
  created_at: number;
}>(
  `SELECT id, kind, payload, created_at FROM worker_errors WHERE payload LIKE '%"appId":"${appId}"%' ORDER BY created_at DESC LIMIT 10;`,
);
console.log("── worker_errors mentioning this app ───");
if (errorRows.length === 0) {
  console.log("  (none in last 10)");
} else {
  for (const e of errorRows) {
    const when = new Date(e.created_at).toISOString();
    const truncated = (e.payload ?? "").slice(0, 120);
    console.log(`  ${when}  ${e.kind}`);
    console.log(`    ${truncated}`);
  }
}
console.log("");
console.log("[inspect] done");
