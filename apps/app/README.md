# @edgepush/app

Dashboard + embedded API for edgepush. Deploys as a single Cloudflare Worker via [OpenNext](https://opennext.js.org/cloudflare).

## What this is

- Next.js 16 app with the full dashboard UI (sign-in, app management, credential upload, delivery log, settings)
- Embedded Hono API at `/api/*` via a catch-all route handler, powered by `@edgepush/server`
- Self-hosters deploy **only this worker** to get the complete edgepush experience

## Development

```bash
pnpm dev
```

Create `apps/app/.env.local` for local development:

```
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## Deploy

```bash
pnpm deploy
```

This runs `opennextjs-cloudflare build && opennextjs-cloudflare deploy`.

## Configuration

- `wrangler.jsonc` - Worker bindings (D1, KV), env vars (`BETTER_AUTH_URL`, `DASHBOARD_URL`, `HOSTED_MODE`)
- `.env.production` - Build-time env vars (`NEXT_PUBLIC_API_URL`), baked into the client bundle by Next.js
- Secrets are set via `wrangler secret put` (see `SELFHOST.md`)

## License

[AGPL-3.0-only](../../LICENSE)
