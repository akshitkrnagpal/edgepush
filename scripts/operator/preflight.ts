#!/usr/bin/env bun
/**
 * Operator pre-launch verification script.
 *
 * Programmatic version of the OPERATOR.md pre-launch checklist.
 * Verifies every required secret is set in the target environment
 * (local or remote), inspects wrangler.jsonc for HOSTED_MODE, and
 * reports a ✓/✗ punch list. Exits 1 if any required item is
 * missing so you can run this in CI if you want.
 *
 * Usage:
 *
 *   bun scripts/operator/preflight.ts              # check local
 *   bun scripts/operator/preflight.ts --remote     # check production
 *   bun scripts/operator/preflight.ts --hosted     # require hosted-tier secrets
 *
 * Without --hosted, only the self-host secret set is checked
 * (ENCRYPTION_KEY, BETTER_AUTH_SECRET, GITHUB_CLIENT_ID,
 * GITHUB_CLIENT_SECRET). With --hosted, Stripe + Resend + operator
 * email are also required.
 *
 * This script reads from `wrangler secret list` output, which means
 * it can only verify that a secret EXISTS, not that its value is
 * correct. You still have to do the end-to-end smoke test from
 * OPERATOR.md.
 */

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
const remote = args.includes("--remote");
const hosted = args.includes("--hosted");

const scope = remote ? "--remote" : "--local";
const API_DIR = "apps/api";

// ----- Secret requirement definitions -----

interface SecretRequirement {
  name: string;
  required: boolean;
  rationale: string;
  hostedOnly?: boolean;
}

const SECRETS: SecretRequirement[] = [
  // Self-host required
  {
    name: "ENCRYPTION_KEY",
    required: true,
    rationale: "AES-GCM key for APNs .p8 + FCM JSON at rest in D1",
  },
  {
    name: "BETTER_AUTH_SECRET",
    required: true,
    rationale: "session encryption key for the dashboard",
  },
  {
    name: "GITHUB_CLIENT_ID",
    required: true,
    rationale: "OAuth client ID for dashboard sign-in",
  },
  {
    name: "GITHUB_CLIENT_SECRET",
    required: true,
    rationale: "OAuth client secret for dashboard sign-in",
  },
  // Optional for self-host, required for hosted
  {
    name: "RESEND_API_KEY",
    required: false,
    rationale: "credential health alerts, operator digest, payment-failed email",
    hostedOnly: true,
  },
  {
    name: "EMAIL_FROM",
    required: false,
    rationale: "From address on outbound mail; defaults to edgepush.dev",
  },
  {
    name: "OPERATOR_EMAIL",
    required: false,
    rationale: "where the daily digest lands",
    hostedOnly: true,
  },
  {
    name: "STRIPE_SECRET_KEY",
    required: false,
    rationale: "create Checkout sessions, fetch subscriptions",
    hostedOnly: true,
  },
  {
    name: "STRIPE_WEBHOOK_SECRET",
    required: false,
    rationale: "verify Stripe-Signature header on incoming webhooks",
    hostedOnly: true,
  },
  {
    name: "STRIPE_PRO_PRICE_ID",
    required: false,
    rationale: "which Stripe Price to bill customers on",
    hostedOnly: true,
  },
  {
    name: "STRIPE_REF_HMAC_KEY",
    required: false,
    rationale: "signs client_reference_id so the webhook can look up users safely",
    hostedOnly: true,
  },
];

interface Check {
  name: string;
  ok: boolean;
  detail: string;
  required: boolean;
}

const checks: Check[] = [];

// ----- Step 1: read wrangler.jsonc and verify structure -----

let wranglerJson: {
  vars?: Record<string, string>;
  d1_databases?: Array<{ database_id?: string }>;
  kv_namespaces?: Array<{ id?: string }>;
  triggers?: { crons?: string[] };
  queues?: { consumers?: Array<{ queue?: string }> };
} = {};

try {
  const raw = readFileSync(join(API_DIR, "wrangler.jsonc"), "utf-8");
  // Strip JSONC comments before parsing
  const stripped = raw
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'])\/\/.*$/gm, "$1");
  wranglerJson = JSON.parse(stripped);
} catch (err) {
  console.error("[preflight] could not read apps/api/wrangler.jsonc:", err);
  process.exit(1);
}

// Check HOSTED_MODE
const hostedMode = wranglerJson.vars?.HOSTED_MODE;
if (hosted) {
  checks.push({
    name: "wrangler.jsonc: HOSTED_MODE=\"true\"",
    ok: hostedMode === "true",
    detail:
      hostedMode === "true"
        ? "set correctly"
        : `got ${JSON.stringify(hostedMode ?? "(unset)")}`,
    required: true,
  });
} else {
  checks.push({
    name: "wrangler.jsonc: HOSTED_MODE",
    ok: hostedMode === "false" || hostedMode == null,
    detail: `${JSON.stringify(hostedMode ?? "(unset)")}`,
    required: false,
  });
}

// Check D1 database_id is not a placeholder
const dbId = wranglerJson.d1_databases?.[0]?.database_id;
checks.push({
  name: "wrangler.jsonc: D1 database_id set",
  ok: typeof dbId === "string" && dbId.length === 36 && !dbId.includes("YOUR"),
  detail: dbId ? `${dbId.slice(0, 8)}…` : "(unset)",
  required: true,
});

// Check KV id
const kvId = wranglerJson.kv_namespaces?.[0]?.id;
checks.push({
  name: "wrangler.jsonc: KV namespace id set",
  ok: typeof kvId === "string" && kvId.length > 0 && !kvId.includes("YOUR"),
  detail: kvId ? `${kvId.slice(0, 8)}…` : "(unset)",
  required: true,
});

// Check cron triggers
const crons = wranglerJson.triggers?.crons ?? [];
checks.push({
  name: "wrangler.jsonc: credential probe cron (0 * * * *)",
  ok: crons.includes("0 * * * *"),
  detail: crons.length > 0 ? crons.join(", ") : "(none)",
  required: true,
});
checks.push({
  name: "wrangler.jsonc: operator digest cron (0 3 * * *)",
  ok: crons.includes("0 3 * * *"),
  detail: crons.length > 0 ? crons.join(", ") : "(none)",
  required: hosted,
});

// Check DLQ consumer
const consumers = wranglerJson.queues?.consumers ?? [];
const hasMain = consumers.some((c) => c.queue === "edgepush-dispatch");
const hasDlq = consumers.some((c) => c.queue === "edgepush-dispatch-dlq");
checks.push({
  name: "wrangler.jsonc: main dispatch consumer",
  ok: hasMain,
  detail: hasMain ? "wired" : "(missing)",
  required: true,
});
checks.push({
  name: "wrangler.jsonc: DLQ consumer for observability",
  ok: hasDlq,
  detail: hasDlq ? "wired" : "(missing, dead-letters won't land in worker_errors)",
  required: true,
});

// ----- Step 2: list secrets via wrangler -----

let secretNames: Set<string> = new Set();
try {
  // `wrangler secret list` outputs JSON when --json is passed.
  const raw = execSync(`wrangler secret list ${scope} --json`, {
    cwd: API_DIR,
    stdio: ["ignore", "pipe", "inherit"],
  }).toString();
  const parsed = JSON.parse(raw) as Array<{ name: string }>;
  secretNames = new Set(parsed.map((s) => s.name));
} catch (err) {
  console.error(
    `[preflight] wrangler secret list failed. If this is a fresh setup, you may need to run \`wrangler login\` first.`,
  );
  console.error("detail:", err instanceof Error ? err.message : err);
  process.exit(1);
}

for (const req of SECRETS) {
  // If we're NOT in hosted mode, skip hosted-only secrets entirely
  // (don't even report them, they're irrelevant noise on self-host).
  if (!hosted && req.hostedOnly) continue;

  const present = secretNames.has(req.name);
  const isRequired = hosted ? req.required || req.hostedOnly === true : req.required;

  checks.push({
    name: `secret: ${req.name}`,
    ok: present,
    detail: present ? "set" : `(${req.rationale})`,
    required: isRequired,
  });
}

// ----- Report -----

const MODE_LABEL = hosted ? "HOSTED" : "SELF-HOST";
console.log(``);
console.log(`── edgepush preflight ─────────────────────────`);
console.log(`  mode:  ${MODE_LABEL}`);
console.log(`  scope: ${remote ? "remote (production)" : "local (dev)"}`);
console.log(``);

let failed = 0;
for (const c of checks) {
  if (c.ok) {
    console.log(`  ✓ ${c.name}  ${c.detail}`);
  } else {
    const marker = c.required ? "✗" : "○";
    console.log(`  ${marker} ${c.name}  ${c.detail}`);
    if (c.required) failed++;
  }
}

console.log(``);
if (failed === 0) {
  console.log(
    `  ✓ ${checks.filter((c) => c.ok).length}/${checks.length} checks passing, ready to ship`,
  );
  console.log(``);
  console.log(`  next steps:`);
  if (hosted) {
    console.log(`  - verify end-to-end Stripe Checkout with a real card in live mode`);
    console.log(`  - manually trigger the d1-backup workflow and test a restore`);
    console.log(`  - run through the OPERATOR.md pre-launch checklist one more time`);
  } else {
    console.log(`  - run the first-push smoke test from SELFHOST.md step 8`);
    console.log(`  - consider enabling the nightly D1 backup workflow`);
  }
  console.log(``);
  process.exit(0);
} else {
  console.log(
    `  ✗ ${failed} required check${failed === 1 ? "" : "s"} failed, do not launch yet`,
  );
  console.log(``);
  console.log(`  see ${hosted ? "OPERATOR.md" : "SELFHOST.md"} for the setup steps`);
  console.log(``);
  process.exit(1);
}
