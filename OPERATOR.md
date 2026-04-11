# Operator runbook — running edgepush.dev

This is the runbook for the person (you) running the hosted tier of
edgepush at `edgepush.dev`. It assumes you've already followed
[SELFHOST.md](./SELFHOST.md) to get the Workers deployed and the D1
migrations applied — this doc covers the extra setup, daily
operations, and incident response that only applies when you're
taking real customer data and charging real money.

If you're not running the hosted tier, you can skip this file. Nothing
here is required for self-host.

---

## Contents

1. [Hosted-tier secrets checklist](#hosted-tier-secrets-checklist)
2. [Stripe setup](#stripe-setup)
3. [Pre-launch operator checklist](#pre-launch-operator-checklist)
4. [Daily operations](#daily-operations)
5. [Incident response](#incident-response)
6. [Migration rollback](#migration-rollback)
7. [Backup restore](#backup-restore)
8. [Deploy procedure](#deploy-procedure)

---

## Hosted-tier secrets checklist

Self-host only needs `ENCRYPTION_KEY`, `BETTER_AUTH_SECRET`, and the
GitHub OAuth secrets. The hosted tier needs the same plus these:

```bash
cd apps/api

# Flip HOSTED_MODE on. This lives in wrangler.jsonc vars, not secrets:
# edit wrangler.jsonc and set "HOSTED_MODE": "true", then re-deploy.
# With HOSTED_MODE=true, the following all activate:
#   - plan limits are enforced on /v1/send (free=10K/mo, pro=50K/mo)
#   - retention cron deletes old messages per plan
#   - billing endpoints return real Stripe Checkout sessions
#   - POST /v1/webhooks/stripe accepts and processes Stripe events

# Transactional email — required for credential health alerts,
# payment-failed emails, and the operator digest.
pnpm exec wrangler secret put RESEND_API_KEY

# Where operator digest emails land. See Daily operations below.
pnpm exec wrangler secret put OPERATOR_EMAIL

# From address for outbound mail. Usually noreply@edgepush.dev.
pnpm exec wrangler secret put EMAIL_FROM

# Stripe secret key (sk_live_... in production, sk_test_... in dev).
pnpm exec wrangler secret put STRIPE_SECRET_KEY

# Stripe webhook signing secret (whsec_...). Obtained when you
# create the webhook endpoint in step Stripe setup below.
pnpm exec wrangler secret put STRIPE_WEBHOOK_SECRET

# Stripe Price ID for the Pro tier (price_...). See Stripe setup.
pnpm exec wrangler secret put STRIPE_PRO_PRICE_ID

# HMAC key used to sign Stripe client_reference_id values so the
# webhook can look up the user without trusting the cardholder email.
# Generate fresh: openssl rand -hex 32
pnpm exec wrangler secret put STRIPE_REF_HMAC_KEY
```

Re-deploy after setting secrets:

```bash
pnpm --filter @edgepush/api deploy
```

### Verify everything is wired

```bash
curl https://api.edgepush.dev/health
# → {"status":"ok"}

# In a browser: sign in, go to /pricing, click "Upgrade to Pro".
# Stripe Checkout should load. Use test card 4242 4242 4242 4242
# (in test mode) to complete the flow and verify the webhook round
# trip updates your subscriptions row.
```

---

## Stripe setup

Do this once, in both test mode and live mode.

### 1. Create a Product and Price

[dashboard.stripe.com/products](https://dashboard.stripe.com/products)

- Product name: `edgepush Pro`
- Pricing: Recurring, $29 USD per month
- Copy the **Price ID** (starts with `price_`) — this is
  `STRIPE_PRO_PRICE_ID`.

### 2. Create a webhook endpoint

[dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks)

- Endpoint URL: `https://api.edgepush.dev/v1/webhooks/stripe`
- Events to listen to:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`
  - `invoice.payment_succeeded`
- Copy the **signing secret** (starts with `whsec_`) — this is
  `STRIPE_WEBHOOK_SECRET`.

### 3. Test the webhook locally

Before flipping production to HOSTED_MODE=true, prove the webhook
path works end-to-end with `stripe listen`:

```bash
stripe listen --forward-to localhost:8787/v1/webhooks/stripe
```

Run a test checkout in the Stripe dashboard with the forward-to
URL captured. The `checkout.session.completed` event should land
and the local `subscriptions` row should flip to `plan='pro'`.

---

## Pre-launch operator checklist

Before you announce edgepush.dev publicly and start taking real
customer `.p8` keys, run through this checklist. Each item is a real
blast-radius concern that you do not want to discover during an
incident.

- [ ] `ENCRYPTION_KEY` is set to a fresh 32-byte random value, not
      reused from dev. If this leaks, every stored credential is
      exposed.
- [ ] `BETTER_AUTH_SECRET` is set to a fresh value. If this leaks,
      every active session can be hijacked.
- [ ] `STRIPE_REF_HMAC_KEY` is set. Without it, an attacker could
      forge a Checkout session with an arbitrary user ID and grant
      themselves a Pro plan.
- [ ] `wrangler.jsonc` has `"HOSTED_MODE": "true"`.
- [ ] `wrangler.jsonc` routes are pointed at your real custom domain.
- [ ] The dashboard (`apps/web`) is deployed and reachable from its
      own domain.
- [ ] `POST /v1/webhooks/stripe` passes an end-to-end test with a
      real `stripe listen` forward.
- [ ] The `.github/workflows/d1-backup.yml` workflow has run
      successfully at least once. Check the Actions tab.
- [ ] `BACKUP_ENCRYPTION_KEY` is set in GitHub Actions secrets. The
      backup workflow prints a warning if it's not — but that warning
      fires on an encrypted artifact nobody will read until they
      desperately need it.
- [ ] `OPERATOR_EMAIL` is set and you've confirmed the address works
      by manually triggering the digest cron (see
      [Daily operations — manual digest](#manual-digest-trigger)).
- [ ] You have a documented place where the kill-switch and replay
      commands live so you can copy-paste them at 2am.
- [ ] The Terms of Service on edgepush.dev contains a clear data
      breach notification clause. Storing customer `.p8` keys
      without one is a legal liability you don't want.
- [ ] You've done a full dry run of the Backup restore procedure
      (below) against a test database. "The backup is fine" and
      "the restore works" are different claims.

If any of these items aren't checked, consider delaying the public
launch and shipping without hosted billing until they are. `OSS-only`
is a valid position and much safer than `OSS + half-configured hosted`.

---

## Daily operations

### Reading the operator digest

You get an email at `OPERATOR_EMAIL` every day at 03:00 UTC IF the
last 24h had any `worker_errors` rows or D1 is past the 7 GB warning
threshold. A quiet day produces no email — that's by design. Don't
train yourself to ignore the digest.

The body format:

```
edgepush daily digest — 2026-04-12T03:00:00.000Z

worker_errors in last 24h: 17
  dispatch      12
  dlq           3
  webhook       2

most recent 5:
  2026-04-12T02:48:12.000Z  dispatch
    {"appId":"app_abc","messageId":"msg_xyz","platform":"ios","error":"APNs 503: ServiceUnavailable"}
  ...

D1 size: 2.81 GB / 10 GB cap (ok)

— edgepush operator digest
```

Interpretation:

- **`dispatch` rows**: APNs/FCM send failures that weren't token-
  invalid. Usually transient provider issues. If one app shows up
  repeatedly, run `scripts/operator/inspect-app.ts <appId>` to
  see what's going on.
- **`dlq` rows**: messages that ran out of retries (3 attempts).
  Each one is a real delivery that didn't happen. Use
  `scripts/operator/replay-dlq.ts <appId> <messageId>` to re-enqueue
  if you believe the underlying cause is resolved.
- **`webhook` rows**: outbound webhook deliveries that 4xx'd or 5xx'd.
  The customer's receiving endpoint is the problem 99% of the time.
- **`D1 size` line**: passive status. Only alarms if > 7 GB.

### Manual digest trigger

To test or force a digest email without waiting for the cron:

```bash
pnpm --filter @edgepush/api exec wrangler dev --test-scheduled
# Then in a separate terminal:
curl "http://localhost:8787/__scheduled?cron=0+3+*+*+*"
```

Or trigger the deployed cron from the Cloudflare dashboard:
Workers → edgepush-api → Triggers → Cron Triggers → click the
`0 3 * * *` trigger's "Run now" button.

### Answering a "my pushes aren't landing" support email

1. Grep the email for an `appId` — customers usually paste it from
   the dashboard URL.
2. Run the inspector:
   ```bash
   bun scripts/operator/inspect-app.ts <appId> --remote
   ```
3. The output gives you: app metadata, owner email, subscription
   state, both credential health rows (with the last probe error if
   broken), last 20 messages, and any `worker_errors` mentioning
   the appId.
4. Common causes:
   - **`apns: BROKEN — InvalidProviderToken`** → customer's `.p8` was
     revoked in the Apple Developer portal. They need to upload a
     fresh one.
   - **`fcm: BROKEN — permission denied`** → customer's service
     account lost the `cloudmessaging.messages:create` role. They
     need to restore it or upload a fresh service account JSON.
   - **All recent messages `failed` with `BadDeviceToken`** →
     customer is passing stale device tokens. Their app needs to
     re-register and send fresh tokens.
   - **No recent messages at all** → customer's SDK isn't hitting us.
     Ask them to run `curl https://api.edgepush.dev/health` from
     their backend and confirm they're using the right `baseUrl`.

---

## Incident response

### Kill switch (stop accepting sends immediately)

If something is actively corrupting data or a bad deploy needs to be
rolled back, flip the kill switch KV key. `/v1/send` will return 503
`maintenance` before touching the DB on every request.

```bash
pnpm --filter @edgepush/api exec wrangler kv key put \
  --binding=CACHE \
  --remote \
  edgepush:killswitch:send "maintenance — fix rolling at 14:30 UTC"
```

The string value is returned to the caller as `detail`, so put
something useful there for customers reading the error body.

To clear:

```bash
pnpm --filter @edgepush/api exec wrangler kv key delete \
  --binding=CACHE \
  --remote \
  edgepush:killswitch:send
```

The kill switch takes effect within a couple of seconds (KV
propagation). The queue consumer and the scheduled crons are NOT
gated by the kill switch — they continue running. If the DB is the
problem, you'll want to additionally unset the dispatch queue
consumer from the Cloudflare dashboard (Workers → Queues →
`edgepush-dispatch` → Pause).

### DLQ replay

When a batch of messages ends up in the dead-letter queue and you've
confirmed the root cause was transient (e.g., APNs 503 storm, now
resolved), replay them one at a time:

```bash
bun scripts/operator/replay-dlq.ts <appId> <messageId> --remote
```

The script:
1. Verifies the `messages` row still exists and belongs to the app.
2. Resets `status='queued'`, clears the error, bumps `updated_at`.
3. Publishes a new dispatch job to `edgepush-dispatch` via
   `wrangler queues producer publish`.

If the queue publish fails, the script prints the exact command to
complete the replay manually. The D1 update has already succeeded at
that point.

For **bulk** replay (an entire DLQ backlog from an outage), don't use
this script — it re-enqueues one at a time. Query `worker_errors`
for the relevant window:

```sql
SELECT payload FROM worker_errors
WHERE kind = 'dlq'
  AND created_at > <unix_ms_of_outage_start>;
```

Loop in a shell script and re-enqueue each message.

### Bad deploy rollback

Cloudflare Workers keeps previous deployments addressable via
`wrangler deployments list`. To roll back:

```bash
pnpm --filter @edgepush/api exec wrangler deployments list
# Copy the ID of the last-known-good deployment
pnpm --filter @edgepush/api exec wrangler rollback <deployment-id>
```

Rollback is near-instant. If the bad deploy also included a D1
migration, see [Migration rollback](#migration-rollback) next — you
typically want to roll back the code FIRST, then the migration, so
the new-schema-expecting code isn't running against the old schema.

---

## Migration rollback

Drizzle generates forward-only migrations. For every migration under
`apps/api/migrations/`, there is a hand-written SQL rollback under
`apps/api/drizzle-rollback/` with the same filename. The rollback
SQL is a destructive operation — it drops columns, drops tables, and
can't recover data that was written since the forward migration ran.

### Rollback procedure

1. **Back up first.** Don't rollback without a fresh backup:
   ```bash
   pnpm --filter @edgepush/api exec wrangler d1 export edgepush \
     --remote \
     --output /tmp/pre-rollback-$(date +%Y%m%d-%H%M%S).sql
   ```

2. **Roll back the code.** The new migration was added because new
   code needed new columns/tables. The code expecting those columns
   must not be running when you drop them:
   ```bash
   pnpm --filter @edgepush/api exec wrangler rollback <last-good-deployment-id>
   ```

3. **Apply the rollback SQL.** Look up the migration tag you want to
   revert (e.g., `0002_heavy_hulk`), then:
   ```bash
   pnpm --filter @edgepush/api exec wrangler d1 execute edgepush \
     --remote \
     --file apps/api/drizzle-rollback/0002_heavy_hulk.sql
   ```

4. **Remove the migration from D1's bookkeeping.** D1 tracks which
   migrations have been applied in an internal table. You need to
   delete the row so a future `db:migrate:remote` doesn't try to
   re-apply the rolled-back migration:
   ```bash
   pnpm --filter @edgepush/api exec wrangler d1 execute edgepush \
     --remote \
     --command "DELETE FROM d1_migrations WHERE name = '0002_heavy_hulk.sql';"
   ```

5. **Verify.** Run a sanity query against the rolled-back schema and
   confirm the application still responds:
   ```bash
   curl https://api.edgepush.dev/health
   ```

---

## Backup restore

If you lose the D1 database entirely, the restore procedure is:

1. **Create a fresh D1 database:**
   ```bash
   pnpm --filter @edgepush/api exec wrangler d1 create edgepush-restored
   # Copy the new UUID
   ```

2. **Download the most recent backup.** Either from the GitHub
   Actions artifact (Actions tab → most recent `d1-backup` run →
   Artifacts section → Download) or from your R2 bucket if you
   configured one:
   ```bash
   aws s3 cp s3://edgepush-backups/d1-backup/edgepush-2026-04-11T04-00-00Z.sql.gz.enc \
     /tmp/restore.sql.gz.enc \
     --endpoint-url https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com
   ```

3. **Decrypt:**
   ```bash
   openssl enc -d -aes-256-cbc -pbkdf2 \
     -K "$BACKUP_ENCRYPTION_KEY" \
     -in /tmp/restore.sql.gz.enc \
     -out /tmp/restore.sql.gz
   ```
   If the backup was unencrypted (`BACKUP_ENCRYPTION_KEY` was unset
   during the backup run), skip this step — you'll have a `.sql.gz`
   directly.

4. **Decompress:**
   ```bash
   gunzip /tmp/restore.sql.gz
   ```

5. **Apply to the fresh D1:**
   ```bash
   pnpm --filter @edgepush/api exec wrangler d1 execute edgepush-restored \
     --remote \
     --file /tmp/restore.sql
   ```
   This re-creates every table and re-inserts every row from the
   moment the backup was taken.

6. **Repoint `wrangler.jsonc`** at the new `database_id` and
   `database_name`, and deploy:
   ```bash
   pnpm --filter @edgepush/api deploy
   ```

Customer-visible downtime = (time since last backup) + (restore
runtime). With nightly backups that's up to 24 hours of lost data
plus about 5 minutes of restore work. That's the hosted tier's SLA
floor — if you need tighter, upgrade to more frequent backups in
the workflow.

---

## Deploy procedure

The CI workflow at `.github/workflows/release.yml` handles SDK and
CLI releases. The Worker and dashboard deploys are manual:

### Normal deploy (code only)

```bash
# Typecheck everything first — turbo cache makes this fast
pnpm typecheck
pnpm test

# Deploy the API Worker
pnpm --filter @edgepush/api deploy

# Deploy the dashboard
pnpm --filter @edgepush/web deploy
```

Order doesn't matter much as long as neither deploy introduces a
breaking API contract in the same PR.

### Deploy with migrations

When a PR includes a new file under `apps/api/migrations/`, the
deploy order matters to avoid the new code hitting old schema (or
vice versa).

**If the migration is ADDITIVE** (new tables, new columns — migration
0002 is the canonical example):
1. Apply the migration first: `pnpm --filter @edgepush/api db:migrate:remote`
2. Then deploy the code: `pnpm --filter @edgepush/api deploy`
3. The old code keeps running fine against the new schema (extra
   columns are ignored); the new code starts using the new columns
   as soon as it's deployed.

**If the migration is BREAKING** (drops columns, renames, type
changes):
1. Ship the code change in two PRs. First PR: add new columns,
   write to both old and new. Deploy. Wait until you're confident
   the new columns are populated and the code no longer reads the
   old columns. Second PR: drop old columns. Deploy.
2. This is the deprecate-then-drop pattern we used for
   `apns_credentials.bundle_id` in Phase 2.

---

## Appendix — secret lifecycle

| Secret | When to rotate | How |
|---|---|---|
| `ENCRYPTION_KEY` | Never rotate silently. Rotating invalidates every stored credential — customers must re-upload. Only rotate on suspected compromise, and announce it. | Generate new, update secret, run a migration that re-encrypts every `apns_credentials.private_key_ciphertext` row with the new key. |
| `BETTER_AUTH_SECRET` | Once per year, or on compromise. | `wrangler secret put`, then all active sessions are invalidated (users are signed out). |
| `STRIPE_REF_HMAC_KEY` | Rarely. Rotating invalidates any in-flight Checkout sessions that have a signed client_reference_id but haven't completed yet. | `wrangler secret put`. In-flight sessions will fail the webhook HMAC check — re-attempts from the customer work fine. |
| `STRIPE_WEBHOOK_SECRET` | Only when you rotate the webhook in Stripe. | Rotate in Stripe first, then `wrangler secret put` within the overlap window. |
| `RESEND_API_KEY` | When the key leaks or Resend rotates it. | `wrangler secret put`. No customer impact. |
| `GITHUB_CLIENT_SECRET` | When GitHub's "Reset secret" is clicked or on compromise. | Rotate in GitHub first, then `wrangler secret put`. No active sessions are invalidated. |
| `BACKUP_ENCRYPTION_KEY` | Never. Rotating makes old backups unreadable. Generate once, store offline, leave alone. | Only if compromised — and if it's compromised, your old backups were too. |

---

## What's NOT in v1

- No admin panel for the operator. You read worker_errors via `wrangler d1 execute`.
- No Stripe Customer Portal. Customer cancellations come as email — you process them manually in the Stripe dashboard.
- No per-customer usage dashboard for the operator. `scripts/operator/inspect-app.ts` is the closest thing.
- No automated alerting beyond the daily digest + credential health emails. If the Worker itself is down, you find out the same way customers do.

These are Phase 1.1 items. If you need them before v1 ships, that's a signal to delay launch rather than paper over the gaps.
