# edgepush

> Open source push notifications for iOS and Android. Self-hosted on Cloudflare Workers, bring your own APNs and FCM credentials.

One API. Native APNs and FCM under the hood. Credentials encrypted in D1, dispatch fanned out through Cloudflare Queues, per-app rate limiting via Durable Objects, delivery receipts you can poll or pipe into a webhook. Runs at the edge so the only thing between your server and a user's device is a Cloudflare worker you control.

If you ship a mobile app and you've ever felt weird about handing your APNs key to a third party, this is for you.

## Status

Early. Working end-to-end (send, dispatch, receipts, webhooks, dashboard) but not yet production-hardened. APIs may shift before 1.0. File issues, send PRs.

## Features

- Single `POST /v1/send` endpoint for iOS and Android
- Bring-your-own APNs `.p8` key and FCM service account JSON, encrypted at rest
- Per-app token-bucket rate limiting (Durable Object backed)
- Async dispatch via Cloudflare Queues with retries and a dead letter queue
- Delivery receipts: poll `/v1/receipts/:id` or set a webhook
- HMAC-signed webhook deliveries
- Dashboard for app management, credential upload, audit log, test sends
- Typed SDK (`@edgepush/sdk`) and CLI (`@edgepush/cli`)
- GitHub OAuth via Better Auth
- Custom domains, observability, runs entirely on Cloudflare

## Hosted

The fastest way to try it is the hosted instance at [edgepush.dev](https://edgepush.dev). Sign in with GitHub, create an app, upload credentials, send a test push from the dashboard. No credit card.

If you'd rather run it yourself, keep reading.

## Send your first push

```ts
import { Edgepush } from "@edgepush/sdk";

const client = new Edgepush({ apiKey: "com.acme.app|sk_..." });

const ticket = await client.send({
  to: deviceToken,
  title: "Build passed",
  body: "Deploy to prod is live.",
  data: { url: "/deploys/abc123" },
});

const receipt = await client.getReceipt(ticket.id);
console.log(receipt.status); // "delivered" | "failed" | "queued"
```

The SDK works in any environment with `fetch`: Node 18+, Bun, Deno, Cloudflare Workers, Vercel, browsers.

## Self-host on Cloudflare

You'll end up with two workers: `edgepush-api` (the HTTP API) and `edgepush-web` (the Next.js dashboard). Plan on 10 minutes if you have a Cloudflare account already.

### Prerequisites

- Cloudflare account
- Node 20+ and pnpm 10+
- A GitHub OAuth app for sign in (Settings → Developer settings → OAuth Apps → New)

### 1. Clone and install

```bash
git clone https://github.com/akshitkrnagpal/edgepush.git
cd edgepush
pnpm install
```

### 2. Create Cloudflare resources

From `apps/api/`:

```bash
cd apps/api

# D1 database for apps, credentials, messages, audit log
pnpm wrangler d1 create edgepush

# KV namespace for hot lookups (api key → app)
pnpm wrangler kv namespace create CACHE

# Queue for dispatch + dead letter queue
pnpm wrangler queues create edgepush-dispatch
pnpm wrangler queues create edgepush-dispatch-dlq
```

Each command prints an id. Paste them into `apps/api/wrangler.jsonc` under `d1_databases[0].database_id` and `kv_namespaces[0].id`. The Durable Object binding (`RATE_LIMITER`) and the queue names are already wired in.

### 3. Set secrets

```bash
# 32-byte hex key used to encrypt APNs/FCM credentials in D1
pnpm wrangler secret put ENCRYPTION_KEY
# generate one with: openssl rand -hex 32

# Better Auth
pnpm wrangler secret put BETTER_AUTH_SECRET
# generate one with: openssl rand -base64 32

pnpm wrangler secret put GITHUB_CLIENT_ID
pnpm wrangler secret put GITHUB_CLIENT_SECRET
```

`BETTER_AUTH_URL` and `DASHBOARD_URL` are non-secret and live in `wrangler.jsonc` under `vars`. Update them to point at the domains you'll use.

### 4. Run migrations

```bash
pnpm db:migrate:remote
```

### 5. Deploy

```bash
# from apps/api
pnpm deploy

# from apps/web
cd ../web
pnpm deploy
```

Both workers will be live on their `*.workers.dev` subdomains. Wire up your custom domains in `wrangler.jsonc` (`routes[*].pattern`) and redeploy.

### 6. Set the GitHub OAuth callback

In your GitHub OAuth app settings, set the authorization callback URL to `https://<your-api-domain>/api/auth/callback/github`.

### Optional: CI/CD via Workers Builds

In the Cloudflare dashboard, connect your fork to each worker (Workers & Pages → worker → Settings → Builds → Connect to Git). Set the deploy command to `pnpm run deploy` for both workers and the root directory to `apps/api` or `apps/web`. Push to main to deploy.

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

PRs welcome. The two highest-leverage areas right now are tests (`apps/api` has none) and docs/examples (React Native, native iOS, native Android). Open an issue first if you're planning anything large so we can talk about scope.

Code style is enforced by eslint and prettier defaults. Run `pnpm lint && pnpm typecheck && pnpm build` before pushing.

## License

MIT. See [LICENSE](./LICENSE).
