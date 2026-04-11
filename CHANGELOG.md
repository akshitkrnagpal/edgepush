# Changelog

All notable changes to edgepush land here. Follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) with
loose semver — versions bump when enough user-visible change
accumulates to be worth naming.

## [Unreleased] — v0.2: full APNs/FCM surface

Closes the capability gap that Expo Push Service has against direct
APNs/FCM. Every field below is supported on the matching native side
and was missing from edgepush v0.1.

### Added — `PushMessage` schema (`packages/shared/src/messages.ts`)

- **`mutableContent: boolean`** — sets `aps[mutable-content] = 1`. The
  required flag for any iOS Notification Service Extension that
  modifies the payload before display (the standard pattern for
  downloading and attaching an `image`).
- **`image: string`** — image URL for rich notifications. On iOS the
  NSE reads it from the custom data block; on Android it's forwarded
  to `android.notification.image` for native rendering.
- **`collapseId: string`** (max 64 bytes) — collapse key. Identical
  keys replace each other on the device. Maps to `apns-collapse-id`
  on iOS and `android.collapse_key` on Android.
- **`pushType`** — explicit APNs push type override. One of `alert`,
  `background`, `voip`, `location`, `complication`, `fileprovider`,
  `mdm`. Defaults to `alert` (or `background` when `contentAvailable`
  is true). Required when sending VoIP, location, complication, or
  similar payloads with their matching topic suffixes.
- **`expirationAt: number`** — absolute Unix expiration timestamp.
  Takes precedence over `ttl` when both are set. Use this when you
  already know the wall-clock deadline (e.g., a meeting reminder
  worthless after 9:00 AM).

### Changed — dispatchers

- `dispatchApns` now forwards `apns-collapse-id`, honors `pushType`,
  honors `expirationAt`, and sets `aps[mutable-content]` and the
  custom-data `image` field.
- `dispatchFcm` now sets `android.collapse_key`, `android.notification.image`
  (and the legacy top-level `notification.image`), and honors
  `expirationAt` by computing the remaining TTL on the fly.

### Changed — CLI

`@edgepush/cli` `send` command gained: `--image`, `--collapse-id`,
`--priority`, `--ttl`, `--expiration-at`, `--push-type`,
`--mutable-content`, `--content-available`, `--time-sensitive`.

### Versioning

- `@edgepush/sdk` 0.1.0 → **0.2.0** (additive — all new fields are
  optional, no breaking changes)
- `@edgepush/cli` 0.1.0 → **0.2.0**

---

## [v0.1] — launch prep

This is the big one. v0.1 is the first "ready to show other
humans" cut of edgepush. Everything below shipped across a single
implementation pass guided by the design doc at
`~/.gstack/projects/akshitkrnagpal-edgepush/`.

### For people sending push

- **One HTTP endpoint for iOS and Android** — `POST /v1/send` was
  already there, but v0.1 is the first version where every code
  path through it (auth, rate limit, quota, dispatch, webhook,
  audit log, health probe) has been stabilized and tested.
- **Delivery event log** with a paginated, filter-by-status table
  on the app detail page. Keyset pagination by `createdAt`
  descending, backed by a new `(appId, status, createdAt)`
  composite index so filter+sort queries don't scan.
- **Credential health panel** per app showing APNs and FCM probe
  state: `● ok` / `○ never probed` / `● broken` / `● topic
  mismatch`. Errors are quoted verbatim from Apple and Google so
  you can actually fix them. Uses `●`/`○` text characters — no
  SVG icons, follows DESIGN.md.
- **First-push auto-scroll**: after you dismiss the "api_key_issued"
  confirmation panel on your first app, the view smooth-scrolls to
  the Recent deliveries panel so your first send lands in view
  without clicks.
- **Pricing page at `/pricing`** — public, no auth. Free tier is 1
  app / 10K events/month / 7-day retention. Pro is $29/mo for 3
  apps / 50K events/month / 14-day retention and priority email
  support from the operator. Self-host is free forever with
  unlimited everything.
- **Account deletion flow in `/dashboard/settings`** — two-step
  confirmation (click → type your email to confirm → click). Does
  a real cascade delete of every app, credential, message,
  webhook, audit log entry, subscription, and usage counter tied
  to the user.

### For people self-hosting

- **`HOSTED_MODE` env var**: the single flag that decides whether
  plan limits, retention purging, and billing endpoints are
  active. `false` (default) means unlimited apps, unlimited
  events, no billing — strictly a superset of hosted features.
- **`SELFHOST.md`** — complete step-by-step guide covering
  prerequisites, resource creation, secrets, migrations, deploy,
  first sign-in, troubleshooting, and the nightly backup workflow.
- **Nightly D1 backup via GitHub Actions** at
  `.github/workflows/d1-backup.yml`. Runs daily at 04:00 UTC,
  gzips + AES-256-CBC encrypts the dump, stores as a GitHub
  artifact (7-day retention) and optionally uploads to R2.
  Requires only `CLOUDFLARE_API_TOKEN` as a required secret;
  everything else is additive.
- **`packageName`-only upload flow**: APNs credential upload no
  longer asks for `bundleId` separately. The server reads it from
  `apps.packageName` via a join. One source of truth; no
  "which-column-wins" bugs.
- **Scheduled crons via `triggers.crons`**:
  - `0 * * * *` hourly credential health probes
  - `0 3 * * *` daily operator digest + D1 size check
- **Dead-letter queue consumer**: `edgepush-dispatch-dlq` gets its
  own queue consumer that logs every dead-lettered message to
  `worker_errors` with `kind='dlq'` so the daily digest surfaces
  them. No second Worker needed — single `queue()` entrypoint
  branches on `batch.queue`.

### For the operator running edgepush.dev

- **`OPERATOR.md`** — complete production runbook. Hosted-tier
  secret checklist, Stripe setup (Product + Price + webhook
  endpoint), pre-launch checklist, daily ops (reading the digest,
  support email playbook), incident response (kill switch, DLQ
  replay, bad deploy rollback), migration rollback procedure,
  backup restore procedure, deploy procedure (additive vs
  breaking migrations), secret rotation lifecycle.
- **`LAUNCH.md`** — ready-to-paste launch copy for Show HN, Twitter
  thread, r/iOSProgramming, r/reactnative, Cloudflare Discord,
  plus a launch day runbook.
- **Kill switch at `edgepush:killswitch:send`**: flip the KV key
  from a single `wrangler kv key put` command and `/v1/send`
  returns 503 before touching auth or the DB. First-line incident
  response.
- **Operator digest cron** (`0 3 * * *`): daily summary email to
  `OPERATOR_EMAIL` with counts by `worker_errors.kind`, 5 most
  recent error payloads, and D1 size status. Silent on clean
  days by design.
- **Operator scripts**:
  - `scripts/operator/replay-dlq.ts <appId> <messageId>` —
    re-enqueues a dead-lettered message into the main dispatch
    queue. Verifies the row, resets status, publishes a new job.
  - `scripts/operator/inspect-app.ts <appId>` — dumps app
    metadata, owner email, subscription state, credential health,
    last 20 messages, and matching `worker_errors` for a support
    email.
- **Stripe Checkout + 5-event webhook handler** at
  `POST /v1/webhooks/stripe`. Handles `checkout.session.completed`,
  `customer.subscription.updated`, `customer.subscription.deleted`,
  `invoice.payment_failed`, `invoice.payment_succeeded`. Verifies
  HMAC signature, dedupes via the `stripe_events` idempotency
  table, rejects stale timestamps outside a 5-minute replay window.
  Uses raw fetch + Web Crypto — no `stripe` npm package, no Node
  polyfills.
- **`client_reference_id` security**: Stripe Checkout sessions
  carry a signed `<userId>.<hmacBase64url>` that the webhook
  handler verifies via HMAC-SHA256 keyed on `STRIPE_REF_HMAC_KEY`.
  Never falls back to email lookup — avoids the
  cardholder-email-vs-signup-email class of bugs.
- **Monthly usage counter** with atomic reservation via
  `UPDATE usage_counters SET events = events + ? WHERE events +
  ? <= limit RETURNING events`. Race-safe across concurrent sends.
  Counter rolls over implicitly on calendar month boundary. Only
  enforced when `HOSTED_MODE=true`.
- **Rate limit check runs BEFORE quota reservation** — a
  rate-limited request doesn't consume billable events. Retry
  succeeds without double-charging.

### For developers reading the code

- **AGPL-3.0 relicense** on the server (`apps/api`) and dashboard
  (`apps/web`). SDK, CLI, and shared types stay MIT so they can
  be embedded in closed-source apps without copyleft obligations.
  `COMMERCIAL.md` explains the dual-license model and when
  someone would need a commercial license (almost never).
- **`lib/mode.ts`** — single `isHosted(env)` helper. Every caller
  that needs to gate behavior on hosted mode imports this. No
  raw string comparisons against `env.HOSTED_MODE` in business
  logic.
- **`lib/observability.ts`** — `logWorkerError(db, { kind, payload })`
  best-effort write to the `worker_errors` table. Swallows its
  own errors so logging failures never cascade.
- **`lib/plan.ts`** — `PLAN_EVENT_LIMITS` and `PLAN_APP_LIMITS` as
  module-level constants. If pricing updates without moving these
  constants, a unit test fails.
- **`lib/stripe.ts`** — raw-fetch Stripe client with hand-rolled
  types for the subset of Stripe objects we touch. Includes
  `signClientReferenceId` / `verifyClientReferenceId` HMAC
  helpers, `verifyWebhookSignature` with replay protection,
  `getOrCreateSubscription`, `upsertSubscriptionFromStripe`.
- **`probes/apns.ts`** — APNs credential health probe. Signs a
  JWT, POSTs a bogus-token send to `api.push.apple.com`, and
  interprets the 12 documented response codes into
  `ok` / `broken` / `topic_mismatch` / `transient`. 16 unit tests
  cover the truth table.
- **`probes/fcm.ts`** — FCM credential health probe. Two-step:
  OAuth2 token exchange then real `messages:send` against a bogus
  token. Catches `PERMISSION_DENIED` / `NOT_FOUND` cases that an
  OAuth-only probe would miss (e.g., service account lost the
  `cloudmessaging.messages:create` role). 13 unit tests.
- **`cron.ts`** — single `scheduled()` dispatch table switching
  on `event.cron`. Two handlers today: `runProbeCycle` and
  `runOperatorDigest`. Probe concurrency capped at 5 in-flight
  per invocation to stay under Apple's shared-egress shadow-ban
  thresholds.
- **Test framework**: vitest 4 with node environment, 5 test
  files, **70 tests**, 308ms wall time. Pure-function tests cover
  the cryptographic + response-interpretation logic that most
  needs regression protection. Integration tests (send path,
  dispatch consumer, account-delete cascade) are deferred to a
  later phase with a clear note in the test plan.

### Schema additions (migration `0002_heavy_hulk.sql`)

Fully additive — zero DROP statements, zero risk to existing send
path. Rollback SQL at `apps/api/drizzle-rollback/0002_heavy_hulk.sql`.

- **`subscriptions`** — one row per user, plan + Stripe IDs +
  period fields. Default `plan='free'` inserted lazily via
  `getOrCreateSubscription`.
- **`usage_counters`** — per-user monthly send counter keyed on
  `(userId, yearMonth)`. Atomic reservation via conditional
  UPDATE.
- **`stripe_events`** — idempotency dedup table for the Stripe
  webhook handler. PK = `event.id`.
- **`worker_errors`** — operator-visible error log. `kind` enum
  covers `dispatch` / `dlq` / `probe_apns` / `probe_fcm` / `cron`
  / `backup` / `webhook` / `stripe`. Indexed on `(createdAt)`
  and `(kind, createdAt)`.
- **`apns_credentials` / `fcm_credentials`** — four new columns
  each: `lastCheckedAt`, `lastCheckOk`, `lastCheckError`,
  `alertSentAt`. Populated by the probe cron.
- **`messages`** — two new composite indexes:
  `(appId, createdAt)` and `(appId, status, createdAt)`. Powers
  the Recent deliveries UI with status filter.
- **`audit_log.action`** enum extended with `subscription.upgraded`,
  `subscription.updated`, `subscription.canceled`, `account.deleted`
  (TypeScript-level — SQLite has no enum constraint).

### Deprecated

- **`apns_credentials.bundle_id`** — the server no longer reads
  this column. It's derived from `apps.package_name` via a join
  in `loadApnsCredentials`. Dashboard PUT still writes to it to
  satisfy the existing NOT NULL constraint until a follow-up
  migration physically drops the column. Deprecate-then-drop
  pattern to avoid any deploy-vs-migration ordering hazard.

### Known not-yet-landed

These were evaluated, planned, and explicitly deferred to keep the
v0.1 scope finishable:

- **R2 archive for log retention** — Pro tier is sized to live
  within D1's 10 GB cap (~3 maxed Pro customers) without R2
  archive. When you need more customers, ship the R2 archive
  writer cron + signed URL download.
- **DLQ replay UI in the dashboard** — operator runs
  `replay-dlq.ts` from a terminal in v0.1. UI surface deferred.
- **Full-text search on the delivery event log** — only
  status + time window filters in v0.1.
- **Stripe Customer Portal** — customers cancel via email, the
  operator processes cancellations manually.
- **Team accounts / SSO / SAML** — no organizations in v0.1.
- **Integration tests** (Miniflare-backed) for the send path,
  dispatch consumer, and account-delete cascade. Pure function
  tests cover the cryptographic layer; DB-touching tests are in
  a later phase.
- **ASC automation** — the earlier design doc's "eat the Apple
  certificate dance" feature (automated bundle ID creation, cert
  lifecycle) is not in v0.1. Codex's cross-model review during
  the office-hours session argued this is a demo trick rather
  than a moat, and the operator accepted that. The ops-first
  wedge is the moat instead.

---

## Versioning philosophy

Until v1.0, "breaking" changes just ship in minor bumps and the
changelog has a prominent "breaking" callout. After v1.0, the SDK
and CLI follow semver properly and the server API carries a
version prefix (`/v1`, `/v2`).

The SDK and CLI have separate version numbers from the server.
Check their individual package.json files for the published
npm version.
