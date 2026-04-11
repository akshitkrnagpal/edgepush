# Self-hosting edgepush

This is the complete guide for deploying edgepush on your own
Cloudflare account. You will end up with:

- An HTTP API Worker at `api.your-domain.com` (or `*.workers.dev`)
- A Next.js dashboard Worker at `your-domain.com`
- A D1 database holding apps, API keys, encrypted credentials, and
  messages
- KV, Queues (with a DLQ), and a Durable Object for rate limiting

Everything runs on the Cloudflare free plan up to real production
traffic. The Workers Paid plan ($5/mo) removes most of the limits
that a solo developer will ever notice — it's the recommended tier.

If you just want to try edgepush without running infrastructure,
[edgepush.dev](https://edgepush.dev) is the hosted version of exactly
this codebase.

---

## Prerequisites

- A Cloudflare account (free is fine to start).
- `node >= 20` and `pnpm >= 10`. The repo pins `pnpm@10.33.0` via
  `packageManager`, so `corepack enable` is the smoothest path.
- `wrangler` CLI. It's a workspace dev dep, so you can run it via
  `pnpm --filter @edgepush/api exec wrangler ...`. If you'd rather
  have it globally, `npm i -g wrangler@4`.
- A GitHub OAuth app — edgepush uses Better Auth's GitHub provider
  for sign-in. You'll create one during setup.

Optional (enables extra features):

- A **Resend** account for transactional email (credential health
  alerts, payment-failed emails, operator digest).
- A **Stripe** account if you want to enable the Pro tier billing
  flow. Self-host works perfectly fine without Stripe — it just
  means `HOSTED_MODE=false` and no quotas.

---

## 1. Clone and install

```bash
git clone https://github.com/akshitkrnagpal/edgepush.git
cd edgepush
pnpm install
```

The monorepo has five packages:

- `apps/api` — the Cloudflare Worker that speaks HTTP, accepts sends,
  runs the dispatch consumer, and hosts the scheduled crons.
- `apps/web` — the Next.js dashboard, deployed as a Worker via
  [`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare).
- `packages/sdk`, `packages/cli`, `packages/shared` — the MIT-licensed
  client libraries. These are published on npm separately and you
  don't need to deploy them.

---

## 2. Create Cloudflare resources

Everything that follows happens inside `apps/api/`. Open a second
terminal there if you like.

### 2.1 D1 database

```bash
pnpm --filter @edgepush/api exec wrangler d1 create edgepush
```

Wrangler prints a `database_id`. **Copy the UUID** — you'll paste it
into `wrangler.jsonc` in a minute.

### 2.2 KV namespace

```bash
pnpm --filter @edgepush/api exec wrangler kv namespace create edgepush-cache
```

Copy the `id` it prints.

### 2.3 Queues (main + DLQ)

```bash
pnpm --filter @edgepush/api exec wrangler queues create edgepush-dispatch
pnpm --filter @edgepush/api exec wrangler queues create edgepush-dispatch-dlq
```

No IDs to copy — queues are referenced by name.

### 2.4 R2 bucket (optional, for long-term log archive + backups)

```bash
pnpm --filter @edgepush/api exec wrangler r2 bucket create edgepush-backups
```

Only needed if you want nightly D1 backups uploaded somewhere durable.
Skip if you're happy with GitHub Actions artifact retention (7 days).

---

## 3. Edit `apps/api/wrangler.jsonc`

The repo ships with the production config for `edgepush.dev`. You
need to point it at the resources you just created.

Change these fields:

```jsonc
{
  "name": "your-edgepush-api",              // pick a unique name
  "routes": [
    // either delete this block (to use the .workers.dev URL)
    // or point it at your custom domain:
    { "pattern": "api.your-domain.com", "custom_domain": true }
  ],

  "vars": {
    "BETTER_AUTH_URL": "https://api.your-domain.com",  // or your workers.dev url
    "DASHBOARD_URL":   "https://your-domain.com",       // where apps/web is deployed
    "HOSTED_MODE":     "false"                          // unlimited, no billing
  },

  "d1_databases": [
    {
      "binding":     "DB",
      "database_name": "edgepush",
      "database_id":   "<paste the UUID from step 2.1>",
      "migrations_dir": "migrations"
    }
  ],

  "kv_namespaces": [
    {
      "binding": "CACHE",
      "id":      "<paste the id from step 2.2>"
    }
  ]

  // queues, durable_objects, migrations, triggers — leave as-is
}
```

`HOSTED_MODE=false` is the important one. With that set:

- `/v1/send` skips all plan limits — self-host is unlimited
- The retention cron is a no-op — your messages never get purged
- The pricing page's "Upgrade to Pro" button returns 501 — there's
  nothing to upgrade to

If you ever flip it to `"true"` you're opting into the full hosted-
tier billing flow and you'll need to wire Stripe (see
[OPERATOR.md](./OPERATOR.md)).

---

## 4. Set secrets

Secrets are set via `wrangler secret put`, not in `wrangler.jsonc`.
They land in Cloudflare's encrypted secret store and are available
to the Worker at runtime as `env.<NAME>`.

### Required

```bash
# 32-byte AES-GCM key used to encrypt APNs .p8 keys and FCM JSONs
# at rest in D1. Generate with: openssl rand -hex 32
pnpm --filter @edgepush/api exec wrangler secret put ENCRYPTION_KEY

# Better Auth session encryption key. Generate with: openssl rand -hex 32
pnpm --filter @edgepush/api exec wrangler secret put BETTER_AUTH_SECRET

# GitHub OAuth app credentials. Create an OAuth app at:
#   https://github.com/settings/developers
# Set the callback URL to:
#   https://api.your-domain.com/api/auth/callback/github
pnpm --filter @edgepush/api exec wrangler secret put GITHUB_CLIENT_ID
pnpm --filter @edgepush/api exec wrangler secret put GITHUB_CLIENT_SECRET
```

### Optional (enable if you want the feature)

```bash
# Resend API key — enables credential health email alerts.
# Without this, alerts log to console.warn only.
pnpm --filter @edgepush/api exec wrangler secret put RESEND_API_KEY

# The From: address on outbound email. Default: noreply@edgepush.dev
pnpm --filter @edgepush/api exec wrangler secret put EMAIL_FROM
```

Skip the `STRIPE_*` secrets entirely unless you're running a paid
tier. The billing endpoints gracefully return 501 without them.

---

## 5. Apply database migrations

```bash
pnpm --filter @edgepush/api db:migrate:remote
```

This runs every file under `apps/api/migrations/` against your
production D1 in order. Expect ~3 migrations to apply and ~40-50
commands to execute — includes the Better Auth tables, the edgepush
schema, and the Phase 1 additions (subscriptions, usage counters,
credential health columns, stripe_events, worker_errors).

If this fails mid-way, the corresponding rollback SQL lives under
`apps/api/drizzle-rollback/`. See
[OPERATOR.md — migration rollback](./OPERATOR.md#migration-rollback)
for the procedure.

---

## 6. Deploy the API Worker

```bash
pnpm --filter @edgepush/api deploy
```

Wrangler builds, uploads, and deploys. When it finishes you'll have
a URL like `https://your-edgepush-api.your-subdomain.workers.dev`
(or your custom domain if you configured one).

Smoke test:

```bash
curl https://your-edgepush-api.your-subdomain.workers.dev/health
```

Should return `{"status":"ok"}`.

---

## 7. Deploy the dashboard

The Next.js dashboard deploys through
[`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare), which
compiles Next into a Worker.

### 7.1 Edit `apps/web/.env.production`

The repo ships with `apps/web/.env.production` already populated for
the hosted instance:

```
NEXT_PUBLIC_API_URL=https://api.edgepush.dev
```

**Edit it to match your API URL before you run the build.** For
example:

```
NEXT_PUBLIC_API_URL=https://api.your-domain.com
```

> **Why this matters and where the `.env.production` value goes**
>
> Next.js inlines `NEXT_PUBLIC_*` values into the client bundle at
> **build time** (via webpack/turbopack DefinePlugin string
> substitution). They are NOT read from `process.env` at runtime in
> the browser. That means setting `NEXT_PUBLIC_API_URL` in the
> `apps/web/wrangler.jsonc` `vars` block does *nothing* — `vars` are
> runtime worker env vars, and they never reach the client bundle.
>
> If you forget this step and ship a build with the wrong URL, the
> symptom is: every dashboard fetch (sign-in, list apps, send a test
> push) hits whatever URL was baked in, usually
> `http://localhost:8787` from the dev fallback in
> `apps/web/src/lib/auth-client.ts`. The fix is to edit
> `apps/web/.env.production`, rebuild, and redeploy.

### 7.2 Deploy

```bash
pnpm --filter @edgepush/web deploy
```

This runs `opennextjs-cloudflare build && opennextjs-cloudflare deploy`.
The dashboard ends up on another `workers.dev` URL (or your custom
domain, if configured via a separate `wrangler.jsonc` inside
`apps/web/`).

---

## 8. First sign-in + smoke test

1. Open your dashboard URL in a browser.
2. Click `$ sign_in_with_github`. Authorize the OAuth app.
3. You land on an empty `workspace / apps` view.
4. Click `$ create_app`, give it a name and a package/bundle ID
   (e.g., `io.example.myapp`).
5. In the app detail page, click `$ new_key` and copy the issued API
   key. Store it somewhere safe — you can't see it again.
6. Upload an APNs `.p8` or FCM service account JSON under the
   `credentials` section.
7. Send a test push via the SDK:

```ts
import { EdgePush } from "@edgepush/sdk";

const edge = new EdgePush({
  apiKey: "your_api_key_here",
  baseUrl: "https://api.your-domain.com",
});

await edge.send({
  to: "your_device_token",
  platform: "ios", // or "android"
  title: "hello from self-host",
  body: "if you're reading this, it works",
});
```

The delivery should land within a few seconds, and you'll see it in
the `recent_deliveries` panel on the app detail page.

---

## 9. (Optional) nightly D1 backup via GitHub Actions

The repo ships a workflow at `.github/workflows/d1-backup.yml` that
takes a nightly snapshot of your D1 database. To enable it on your
fork:

1. Set these repo secrets in GitHub (Settings → Secrets and variables
   → Actions):
   - `CLOUDFLARE_API_TOKEN` (required) — create at
     [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens)
     with D1 read permissions.
   - `BACKUP_ENCRYPTION_KEY` (strongly recommended) — 32 bytes hex,
     `openssl rand -hex 32`. Without this, the dump stores plaintext
     in the GitHub Actions artifact. Fine as a fallback, not fine if
     your D1 holds real customer `.p8` keys.
   - `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`,
     `R2_BUCKET` (optional) — enables upload to your R2 bucket from
     step 2.4 for long-term retention beyond 7 days.

2. The workflow runs at 04:00 UTC daily and can be triggered manually
   from the Actions tab.

See [OPERATOR.md — backup restore](./OPERATOR.md#backup-restore) for
how to restore from one of these backups.

---

## What's different from the hosted tier?

`edgepush.dev` is this exact codebase with `HOSTED_MODE=true` and a
handful of extra secrets (Stripe, Resend). Self-host is strictly a
subset of the functionality — you get everything that runs on your
own infrastructure and none of the things that are explicitly tied
to the hosted-tier business model.

| Feature | Self-host | Hosted (edgepush.dev) |
|---|---|---|
| HTTP API, SDK, CLI | ✓ | ✓ |
| APNs + FCM dispatch | ✓ | ✓ |
| Delivery event log | ✓ | ✓ |
| Credential health probes | ✓ (you run the cron) | ✓ (we run it) |
| Webhook deliveries | ✓ | ✓ |
| DLQ + retry + replay | ✓ | ✓ |
| Account limits (apps / events) | ∞ unlimited | plan-gated |
| Log retention | your rules | plan-gated |
| Billing / Stripe Checkout | n/a | ✓ |
| Operator email support | n/a | ✓ (we run it) |

The license is the same — AGPL-3.0 on the server, MIT on the SDK —
so you can embed `@edgepush/sdk` in a closed-source mobile app's
backend regardless of which tier you use.

---

## Troubleshooting

**`wrangler d1 migrations apply` fails with "database not found"**
The `database_id` in `wrangler.jsonc` doesn't match what you got
back from `wrangler d1 create`. Re-run `wrangler d1 list` to see
your databases.

**The dashboard loads but `/api/dashboard/apps` returns CORS errors**
`NEXT_PUBLIC_API_URL` points at a different origin than
`DASHBOARD_URL`. For cookies to travel between them, both must share
a parent domain (e.g., `edgepush.dev` + `api.edgepush.dev`). On the
free `*.workers.dev` URLs, dashboard and API must use the same
subdomain or you need to front both with a custom domain.

**Send returns 503 `maintenance`**
The operator kill switch KV key is set. Clear it:
```bash
pnpm --filter @edgepush/api exec wrangler kv key delete \
  --binding=CACHE edgepush:killswitch:send
```

**APNs credential shows `● never probed` forever**
The `0 * * * *` cron trigger isn't firing. Check that your
`wrangler.jsonc` has the `triggers.crons` block and that you deployed
after adding it. Cron triggers require a `wrangler deploy` to take
effect — editing the config alone isn't enough.

**"Nothing happens when I sign in"**
Check that the GitHub OAuth app callback URL is exactly:
`https://<your-api-domain>/api/auth/callback/github` — including the
trailing path. Better Auth is picky about this.

**Sign-in (or any dashboard fetch) hits `http://localhost:8787` and 404s**
You deployed a build that didn't have `NEXT_PUBLIC_API_URL` set, so
Next.js inlined the dev fallback from `apps/web/src/lib/auth-client.ts`
into the client bundle. `NEXT_PUBLIC_*` env vars are baked at BUILD
time, not read at runtime — putting the URL in `wrangler.jsonc` `vars`
won't help. Edit `apps/web/.env.production` to point at your API
worker and re-run `pnpm --filter @edgepush/web deploy`.

---

## Next steps

- Read [OPERATOR.md](./OPERATOR.md) if you want to understand the
  runbook for incident response, backup restore, and migration
  rollback — even self-hosters benefit from knowing what to do when
  something goes sideways.
- Open an issue on GitHub if any of the above is wrong or unclear.
  Self-host docs rot fast and the only way they stay honest is
  people telling us when they break.
