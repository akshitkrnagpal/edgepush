# edgepush

[![CI](https://github.com/akshitkrnagpal/edgepush/actions/workflows/ci.yml/badge.svg)](https://github.com/akshitkrnagpal/edgepush/actions/workflows/ci.yml)
[![npm @edgepush/sdk](https://img.shields.io/npm/v/@edgepush/sdk?label=%40edgepush%2Fsdk)](https://www.npmjs.com/package/@edgepush/sdk)
[![npm @edgepush/cli](https://img.shields.io/npm/v/@edgepush/cli?label=%40edgepush%2Fcli)](https://www.npmjs.com/package/@edgepush/cli)
[![License: AGPL-3.0](https://img.shields.io/badge/server-AGPL--3.0-blue)](./LICENSE)
[![License: MIT](https://img.shields.io/badge/sdk%2Bcli-MIT-green)](./packages/sdk/LICENSE)

> Open source push notifications for iOS and Android. Hosted at [edgepush.dev](https://edgepush.dev) or self-hosted on Cloudflare Workers. Bring your own APNs and FCM credentials.

**Server + dashboard: [AGPL-3.0](./LICENSE). SDK + CLI: MIT.** See [`COMMERCIAL.md`](./COMMERCIAL.md) for the dual-license details and when you'd need a commercial license (most users never do).

One API. Native APNs and FCM under the hood. Credentials encrypted in D1, dispatch fanned out through Cloudflare Queues, per-app rate limiting via Durable Objects, delivery receipts you can poll or pipe into a webhook. Runs at the edge so the only thing between your server and a user's device is a Cloudflare worker you control.

If you ship a mobile app and you've ever felt weird about handing your APNs key to a third party, this is for you.

## Status

**v1.1, stable.** Full APNs/FCM payload surface, FCM topic/condition targeting, webhook retry queue, CLI with OAuth login, deep health endpoint, 18-section docs. Semver from v1.0 onward. See [`CHANGELOG.md`](./CHANGELOG.md) for the full history.

## Features

### Push sending
- Single `POST /v1/send` endpoint for iOS and Android
- BYO APNs `.p8` key and FCM service account JSON, encrypted in D1 with AES-GCM
- Full APNs/FCM payload surface: rich images (`mutableContent` + `image`), `collapseId`, fine-grained `pushType` (alert, background, voip, location, complication, fileprovider, mdm), absolute `expirationAt` timestamps
- FCM topic and condition targeting: send to all subscribers of a topic or a boolean combination of topics
- Async dispatch via Cloudflare Queues with automatic retries and a dead letter queue
- Delivery receipts: poll `GET /v1/receipts/:id` or set a webhook
- HMAC-signed outbound webhook deliveries with a dedicated retry queue (3 retries with backoff, separate DLQ)
- Per-app token-bucket rate limiting via a Durable Object

### Observability + reliability
- Searchable delivery event log with status filter and keyset pagination
- Active credential health probes: every APNs and FCM credential is authenticated against Apple and Google every 24h; broken creds trigger an email alert before your users notice
- Dead-letter queue consumer that logs every dead-letter to `worker_errors` for the operator digest
- Webhook delivery failures logged to `worker_errors` for operator visibility
- Deep health endpoint (`GET /health/deep`): pings D1, KV, reports killswitch state and queue binding presence, gated on an operator token
- Daily operator digest email: summary of `worker_errors` by kind, D1 size status, only sent when there's something to report
- Kill switch KV key the operator can flip from a single `wrangler kv key put` command
- Operator scripts: `scripts/operator/replay-dlq.ts` and `scripts/operator/inspect-app.ts` for incident response and support workflows

### Billing (hosted tier)
- Stripe Checkout with HMAC-signed `client_reference_id` (no cardholder-email-vs-signup-email bug class)
- Stripe Billing Portal for self-service subscription management (cancel, update payment, view invoices)
- 5-event webhook handler with idempotency dedup, 5-minute replay window, raw-fetch (no `stripe` npm package)
- Monthly send counter with atomic reservation, race-safe on concurrent sends at the quota boundary
- Plan gating via `HOSTED_MODE` env var: `false` means unlimited (self-host), `true` enforces the Free / Pro limits

### Developer + operator experience
- Dashboard for app management, credential upload, credential health, recent deliveries, audit log, test sends, account deletion, billing
- Typed SDK (`@edgepush/sdk`) and CLI (`@edgepush/cli`) published to npm
- CLI supports the full field surface: `--image`, `--collapse-id`, `--push-type`, `--topic`, `--condition`, `--mutable-content`, `--expiration-at`, and more
- GitHub OAuth via Better Auth
- Scheduled crons for credential probes and operator digest
- Nightly D1 backup via GitHub Actions with optional AES-256-CBC encryption and R2 upload
- 70 unit tests covering the cryptographic + response-interpretation logic
- 18-section docs at `/docs` with per-section routes (iOS, Android, React Native, rich notifications, FCM topics, error codes, rate limits, webhooks, API keys, and more)
- `SELFHOST.md` full self-host guide + `CONTRIBUTING.md`

## Hosted

The fastest way to try it is the hosted instance at [edgepush.dev](https://edgepush.dev). Sign in with GitHub, create an app, upload credentials, send a test push from the dashboard. No credit card on the free tier. The Pro tier is $29/mo, see [`/pricing`](https://edgepush.dev/pricing).

If you'd rather run it yourself, [`SELFHOST.md`](./SELFHOST.md) is the full guide.

## Send your first push

```ts
import { Edgepush } from "@edgepush/sdk";

const client = new Edgepush({ apiKey: "com.acme.app|sk_..." });

const ticket = await client.send({
  to: deviceToken,                      // native APNs or FCM token
  title: "New order #4271",
  body: "2x flat white, table 3",
  image: "https://cdn.acme.app/o/4271.jpg",
  mutableContent: true,                 // iOS NSE downloads `image`
  collapseId: "order-4271",             // replaces prior pushes for #4271
  expirationAt: Math.floor(Date.now() / 1000) + 600,
});

const receipt = await client.getReceipt(ticket.id);
console.log(receipt.status); // "delivered" | "failed" | "queued"
```

The SDK works in any environment with `fetch`: Node 18+, Bun, Deno, Cloudflare Workers, Vercel, browsers. Every field above maps directly to the corresponding APNs or FCM payload, no proprietary token format, no abstracted-away headers.

## Self-host on Cloudflare

**Full guide: [`SELFHOST.md`](./SELFHOST.md)** (prerequisites, resource creation, secrets, deploy, first-push smoke test, troubleshooting).

Quick summary if you already know Cloudflare Workers:

```bash
git clone https://github.com/akshitkrnagpal/edgepush.git
cd edgepush && pnpm install

# Create resources (from the repo root)
pnpm --filter @edgepush/app exec wrangler d1 create edgepush
pnpm --filter @edgepush/app exec wrangler kv namespace create edgepush-cache

# Paste the printed IDs into apps/app/wrangler.jsonc

# Set secrets
pnpm --filter @edgepush/app exec wrangler secret put ENCRYPTION_KEY       # openssl rand -hex 32
pnpm --filter @edgepush/app exec wrangler secret put BETTER_AUTH_SECRET   # openssl rand -hex 32
pnpm --filter @edgepush/app exec wrangler secret put GITHUB_CLIENT_ID
pnpm --filter @edgepush/app exec wrangler secret put GITHUB_CLIENT_SECRET

# Edit apps/app/.env.production with your API URL
# Build + deploy
pnpm build
pnpm --filter @edgepush/app deploy
```

Self-hosters only need `apps/app` - it includes the dashboard and embedded API. `apps/api` is an optional separate worker for lower cold-start latency on the push hot path. See [`SELFHOST.md`](./SELFHOST.md) for the full guide.

Self-host runs with `HOSTED_MODE=false`, unlimited apps and events, no billing gates, no credential probe rate-limit concerns from the hosted tier. Everything else (SDK, CLI, API, webhooks, dashboard, DLQ, probe cron) works the same as `edgepush.dev`.

If you plan to run your own paid tier (Stripe Checkout, billing webhooks, operator digest, backups), email hello@edgepush.dev for the operator runbook.

## Architecture

```
                                ┌──────────────────────┐
                                │   apps/app           │
                                │   Next.js dashboard  │
                                │   + embedded API     │
                                │   (OpenNext worker)  │
                                └──────────┬───────────┘
                                           │ /api/* routes (Hono)
                                           ▼
┌──────────────┐    /v1/send   ┌──────────────────────┐    enqueue   ┌──────────────┐
│ your server  │──────────────▶│   packages/server    │─────────────▶│ CF Queue     │
│ (Node, Bun,  │               │   Hono API core      │              │ (dispatch)   │
│  curl, etc.) │◀──────────────│                      │              └──────┬───────┘
└──────────────┘   ticket id   │   ┌──────────────┐   │                     │
                               │   │ RateLimiter  │   │                     │ consumer
                               │   │ (DO, per app)│   │                     ▼
                               │   └──────────────┘   │              ┌──────────────┐
                               │                      │              │ dispatch.ts  │
                               │   ┌──────────────┐   │              │ APNs / FCM   │
                               │   │ D1 (apps,    │◀──┼──────────────│              │
                               │   │ credentials, │   │ writes       └──────┬───────┘
                               │   │ messages,    │   │                     │
                               │   │ audit log)   │   │                     │ webhook
                               │   └──────────────┘   │                     ▼
                               └──────────────────────┘              ┌──────────────┐
                                                                     │ your webhook │
                                                                     └──────────────┘
```

## Repo layout

```
apps/
  web/         Marketing site (edgepush.dev). Landing, docs, pricing, legal.
  app/         Dashboard + embedded API (app.edgepush.dev). Sign-in,
               dashboard, /api/* routes. Self-hosters deploy this.
  api/         Optional Hono hot-path worker (api.edgepush.dev). Thin
               re-export of @edgepush/server for lower cold starts.

packages/
  server/      Compiled API core (tsup). Hono app, route handlers,
               dispatch, crons, probes, billing, Drizzle schema +
               migrations. Imported by apps/app and apps/api.
  orpc/        oRPC router contract + zod schemas.
  sdk/         @edgepush/sdk. Typed client for any fetch-capable runtime.
  cli/         @edgepush/cli. Terminal client. Login, send, receipt.
```

## Development

```bash
# install
pnpm install

# typecheck everything
pnpm typecheck

# build everything (turbo)
pnpm build

# lint
pnpm lint

# dashboard + embedded API dev server (next dev)
cd apps/app && pnpm dev

# marketing site dev server (next dev)
cd apps/web && pnpm dev

# optional: standalone API worker (wrangler dev)
cd apps/api && pnpm dev
```

For local development, create `apps/app/.env.local` with `NEXT_PUBLIC_API_URL=http://localhost:3000` (or your dev server port). Do not edit `.env.production` for local dev.

## CLI

```bash
npm install -g @edgepush/cli
edgepush login              # paste an API key
edgepush send <token> --title "Hi" --body "From the CLI"
edgepush receipt <id>
```

## Contributing

PRs welcome. The highest-leverage areas right now are:

- **Integration tests** for the send path, dispatch consumer, and account-delete cascade (70 pure-function unit tests exist but no D1-backed integration tests yet)
- **Mobile SDK examples**: React Native, native iOS, native Android
- **Self-host troubleshooting**, if you hit something that's not in `SELFHOST.md`'s Troubleshooting section, open an issue with the fix

Open an issue first if you're planning anything large so we can talk about scope. All contributions to the server or dashboard land under AGPL-3.0; contributions to the SDK and CLI stay MIT. See [`COMMERCIAL.md`](./COMMERCIAL.md) for the dual-license rationale.

Code style is enforced by eslint and prettier defaults. Run `pnpm lint && pnpm typecheck && pnpm test && pnpm build` before pushing, all four should be green.

## License

Dual licensed:

- **`apps/api` (server) + `apps/app` (dashboard) + `packages/server` + `packages/orpc`**: [AGPL-3.0-only](./LICENSE)
- **`packages/sdk` + `packages/cli`**: [MIT](./packages/sdk/LICENSE)

The SDK and CLI are MIT so you can embed them in a closed-source backend or mobile app without AGPL obligations. The server and dashboard are AGPL so nobody can fork edgepush into a closed-source competing hosted service.

See [`COMMERCIAL.md`](./COMMERCIAL.md) for the commercial license option (rare, most users never need it).
