# edgepush

> Open source push notifications for iOS and Android. Hosted at [edgepush.dev](https://edgepush.dev) or self-hosted on Cloudflare Workers. Bring your own APNs and FCM credentials.

**Server + dashboard: [AGPL-3.0](./LICENSE). SDK + CLI: MIT.** See [`COMMERCIAL.md`](./COMMERCIAL.md) for the dual-license details and when you'd need a commercial license (most users never do).

One API. Native APNs and FCM under the hood. Credentials encrypted in D1, dispatch fanned out through Cloudflare Queues, per-app rate limiting via Durable Objects, delivery receipts you can poll or pipe into a webhook. Runs at the edge so the only thing between your server and a user's device is a Cloudflare worker you control.

If you ship a mobile app and you've ever felt weird about handing your APNs key to a third party, this is for you.

## Status

**v0.1, launch-ready.** Working end to end, send, dispatch, receipts, webhooks, dashboard, credential health probes, monthly quotas, Stripe billing, nightly backups. APIs may shift before 1.0. See [`CHANGELOG.md`](./CHANGELOG.md) for the full list of what landed and what was deliberately deferred.

## Features

### Push sending
- Single `POST /v1/send` endpoint for iOS and Android
- BYO APNs `.p8` key and FCM service account JSON, encrypted in D1 with AES-GCM
- Async dispatch via Cloudflare Queues with automatic retries and a dead letter queue
- Delivery receipts: poll `GET /v1/receipts/:id` or set a webhook
- HMAC-signed outbound webhook deliveries
- Per-app token-bucket rate limiting via a Durable Object

### Observability + reliability
- Searchable delivery event log with status filter and keyset pagination
- Active credential health probes: every APNs and FCM credential is authenticated against Apple and Google every 24h; broken creds trigger an email alert before your users notice
- Dead-letter queue consumer that logs every dead-letter to `worker_errors` for the operator digest
- Daily operator digest email: summary of `worker_errors` by kind, D1 size status, only sent when there's something to report
- Kill switch KV key the operator can flip from a single `wrangler kv key put` command
- Operator scripts: `scripts/operator/replay-dlq.ts` and `scripts/operator/inspect-app.ts` for incident response and support workflows

### Billing (hosted tier)
- Stripe Checkout with HMAC-signed `client_reference_id` (no cardholder-email-vs-signup-email bug class)
- 5-event webhook handler with idempotency dedup, 5-minute replay window, raw-fetch (no `stripe` npm package)
- Monthly send counter with atomic reservation, race-safe on concurrent sends at the quota boundary
- Plan gating via `HOSTED_MODE` env var: `false` means unlimited (self-host), `true` enforces the Free / Pro limits

### Developer + operator experience
- Dashboard for app management, credential upload, credential health, recent deliveries, audit log, test sends, account deletion, billing
- Typed SDK (`@edgepush/sdk`) and CLI (`@edgepush/cli`) published to npm
- GitHub OAuth via Better Auth
- Scheduled crons for credential probes and operator digest
- Nightly D1 backup via GitHub Actions with optional AES-256-CBC encryption and R2 upload
- 70 unit tests covering the cryptographic + response-interpretation logic
- `SELFHOST.md` full self-host guide + `OPERATOR.md` production runbook

## Hosted

The fastest way to try it is the hosted instance at [edgepush.dev](https://edgepush.dev). Sign in with GitHub, create an app, upload credentials, send a test push from the dashboard. No credit card on the free tier. The Pro tier is $29/mo, see [`/pricing`](https://edgepush.dev/pricing).

If you'd rather run it yourself, [`SELFHOST.md`](./SELFHOST.md) is the full guide. If you're running your OWN hosted tier with billing (i.e., you want to sell an edgepush deployment to someone), [`OPERATOR.md`](./OPERATOR.md) is the production runbook.

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
cd apps/api

# Create resources
pnpm wrangler d1 create edgepush
pnpm wrangler kv namespace create edgepush-cache
pnpm wrangler queues create edgepush-dispatch
pnpm wrangler queues create edgepush-dispatch-dlq

# Paste the printed IDs into wrangler.jsonc

# Set secrets (see SELFHOST.md for the full list)
pnpm wrangler secret put ENCRYPTION_KEY       # openssl rand -hex 32
pnpm wrangler secret put BETTER_AUTH_SECRET   # openssl rand -hex 32
pnpm wrangler secret put GITHUB_CLIENT_ID
pnpm wrangler secret put GITHUB_CLIENT_SECRET

# Migrate + deploy
pnpm db:migrate:remote
pnpm deploy
cd ../web && pnpm deploy
```

Self-host runs with `HOSTED_MODE=false`, unlimited apps and events, no billing gates, no credential probe rate-limit concerns from the hosted tier. Everything else (SDK, CLI, API, webhooks, dashboard, DLQ, probe cron) works the same as `edgepush.dev`.

If you plan to run your own paid tier (Stripe Checkout, billing webhooks, operator digest, backups), also read [`OPERATOR.md`](./OPERATOR.md).

## Architecture

```
                                ┌──────────────────────┐
                                │   apps/web           │
                                │   Next.js dashboard  │
                                │   (OpenNext worker)  │
                                └──────────┬───────────┘
                                           │ fetch (cookies)
                                           ▼
┌──────────────┐    /v1/send   ┌──────────────────────┐    enqueue   ┌──────────────┐
│ your server  │──────────────▶│   apps/api           │─────────────▶│ CF Queue     │
│ (Node, Bun,  │               │   Hono on Workers    │              │ (dispatch)   │
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
  api/         Cloudflare Worker. Hono routes, dispatch consumer,
               DO rate limiter, D1 schema, APNs and FCM clients.
  web/         Next.js 16 dashboard, deployed via @opennextjs/cloudflare.
               Pages for apps, credentials, messages, audit, webhook,
               test send, settings.

packages/
  sdk/         @edgepush/sdk - typed client. Works in any fetch-capable
               runtime.
  cli/         @edgepush/cli - terminal client. Login, send, receipt.
  shared/      Zod schemas and types shared between api, sdk, and web.
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

# api dev server (wrangler dev)
cd apps/api && pnpm dev

# web dev server (next dev)
cd apps/web && pnpm dev
```

For a local end-to-end run you'll want a local D1 (`pnpm db:migrate:local` from `apps/api/`) and the api running on `wrangler dev`. Point `NEXT_PUBLIC_API_URL` at `http://localhost:8787` while developing the dashboard.

## CLI

```bash
npm install -g @edgepush/cli
edgepush login              # paste an API key
edgepush send <token> --title "Hi" --body "From the CLI"
edgepush receipt <id>
```

## Contributing

PRs welcome. The highest-leverage areas right now are:

- **Integration tests** for the send path, dispatch consumer, and account-delete cascade (v0.1 has 70 pure-function unit tests but no D1-backed integration tests yet, see `CHANGELOG.md` "Known not-yet-landed" for context)
- **Mobile SDK examples**: React Native, native iOS, native Android
- **Self-host troubleshooting**, if you hit something that's not in `SELFHOST.md`'s Troubleshooting section, open an issue with the fix

Open an issue first if you're planning anything large so we can talk about scope. All contributions to the server (`apps/api`) or dashboard (`apps/web`) land under AGPL-3.0; contributions to the SDK/CLI/shared packages stay MIT. See [`COMMERCIAL.md`](./COMMERCIAL.md) for the dual-license rationale.

Code style is enforced by eslint and prettier defaults. Run `pnpm lint && pnpm typecheck && pnpm test && pnpm build` before pushing, all four should be green.

## License

Dual licensed:

- **`apps/api` (server) + `apps/web` (dashboard)**: [AGPL-3.0-only](./LICENSE)
- **`packages/sdk` + `packages/cli` + `packages/shared`**: [MIT](./packages/sdk/LICENSE)

The SDK and CLI are MIT so you can embed them in a closed-source backend or mobile app without AGPL obligations. The server and dashboard are AGPL so nobody can fork edgepush into a closed-source competing hosted service.

See [`COMMERCIAL.md`](./COMMERCIAL.md) for the commercial license option (rare, most users never need it).
