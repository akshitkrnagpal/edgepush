# edgepush

> Open source alternative to Expo Push Notification Service, built on Cloudflare.

Send push notifications to iOS and Android with a single API. Bring your own APNs and FCM credentials, keep them encrypted in D1, and dispatch at the edge via Cloudflare Workers.

## Status

Early development. Not ready for production.

## Stack

- Cloudflare Workers + Hono for the HTTP API
- Cloudflare D1 for tenants, apps, tokens, receipts
- Cloudflare Durable Objects for per-app rate limiting
- Cloudflare Queues for async push fan-out with retries
- Better Auth for multi-tenant auth
- Next.js on Cloudflare Pages for the dashboard

## Monorepo

```
apps/
  api/         Cloudflare Worker (the HTTP API)
  web/         Next.js landing + dashboard
packages/
  shared/      Shared types
```

## License

MIT
