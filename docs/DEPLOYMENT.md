# Deploying edgepush

edgepush runs entirely on Cloudflare. Self-hosting takes about 10 minutes.

## Prerequisites

- A Cloudflare account
- Node.js 20+ and pnpm 10+
- A domain (optional; workers.dev subdomain works fine for the API)

## 1. Clone and install

```bash
git clone https://github.com/akshitkrnagpal/edgepush.git
cd edgepush
pnpm install
```

## 2. Create Cloudflare resources

```bash
cd apps/api

# D1 database
pnpm dlx wrangler d1 create edgepush
# -> copy the database_id into wrangler.jsonc

# KV namespace (for hot-path caching)
pnpm dlx wrangler kv namespace create CACHE
# -> copy the id into wrangler.jsonc

# Queue for push dispatch with retries
pnpm dlx wrangler queues create edgepush-dispatch
pnpm dlx wrangler queues create edgepush-dispatch-dlq
```

Open `apps/api/wrangler.jsonc` and replace the placeholder IDs with the
real ones you just printed.

## 3. Set secrets

```bash
# 32-byte AES key used to encrypt APNs/FCM credentials at rest
pnpm dlx wrangler secret put ENCRYPTION_KEY
# Paste the output of: openssl rand -base64 32

# Better Auth secret (sign session cookies)
pnpm dlx wrangler secret put BETTER_AUTH_SECRET
# Paste the output of: openssl rand -base64 32

# Optional: Resend API key for verification + password reset emails
pnpm dlx wrangler secret put RESEND_API_KEY

# Optional: Google OAuth
pnpm dlx wrangler secret put GOOGLE_CLIENT_ID
pnpm dlx wrangler secret put GOOGLE_CLIENT_SECRET

# Optional: GitHub OAuth
pnpm dlx wrangler secret put GITHUB_CLIENT_ID
pnpm dlx wrangler secret put GITHUB_CLIENT_SECRET
```

Update `vars.BETTER_AUTH_URL` in `wrangler.jsonc` to match the URL your
Worker will be deployed to (e.g. `https://edgepush-api.<your-subdomain>.workers.dev`
or a custom domain).

## 4. Apply migrations

```bash
pnpm dlx wrangler d1 migrations apply edgepush --remote
```

## 5. Deploy the Worker

```bash
pnpm dlx wrangler deploy
```

Your API is now live at the URL wrangler printed. Test it:

```bash
curl https://edgepush-api.<your-subdomain>.workers.dev/health
# {"status":"ok"}
```

## 6. Deploy the dashboard

The Next.js dashboard can be deployed to Cloudflare Pages or Vercel. For
Cloudflare Pages with the OpenNext adapter:

```bash
cd apps/web
pnpm dlx @opennextjs/cloudflare@latest build
pnpm dlx wrangler pages deploy .open-next/assets
```

Or deploy to Vercel:

```bash
cd apps/web
vercel deploy
```

Set `NEXT_PUBLIC_API_URL` to your deployed Worker URL in the dashboard
hosting environment.

## 7. Configure CORS

Open `apps/api/src/index.ts` and update the CORS origin to match your
dashboard URL:

```ts
app.use(
  "*",
  cors({
    origin: "https://dashboard.edgepush.dev",
    credentials: true,
    allowHeaders: ["content-type", "authorization"],
  }),
);
```

Also set the `DASHBOARD_URL` secret so Better Auth trusts the dashboard
origin:

```bash
pnpm dlx wrangler secret put DASHBOARD_URL
# Paste: https://dashboard.edgepush.dev
```

Redeploy the Worker.

## 8. Sign up and send your first push

1. Open the dashboard URL
2. Create an account
3. Click "New app", enter a name and package name (e.g. `io.akshit.myapp`)
4. Upload your APNs .p8 key and/or Firebase service account JSON
5. Generate an API key, copy it immediately
6. Send a test push:

   ```bash
   curl -X POST https://edgepush-api.<your-subdomain>.workers.dev/v1/send \
     -H "Authorization: Bearer io.akshit.myapp|..." \
     -H "Content-Type: application/json" \
     -d '{
       "messages": [{
         "to": "DEVICE_TOKEN",
         "title": "Hello",
         "body": "World"
       }]
     }'
   ```

## Troubleshooting

**"APNs credentials not configured"**: Upload your .p8 file in the
dashboard under App -> Credentials -> APNs.

**"Rate limited"**: Default is 1000 messages/minute per app. Adjust in
`apps/api/src/rate-limiter.ts`.

**Better Auth session not persisting**: Check that `BETTER_AUTH_URL`
in `wrangler.jsonc` matches your actual deployment URL and that CORS
is configured to allow the dashboard origin with `credentials: true`.

**Queue consumer not running**: Check the dashboard in Cloudflare for
the queue consumer logs. Make sure the queue binding in `wrangler.jsonc`
matches the queue you created.
