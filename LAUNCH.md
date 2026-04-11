# Launch drafts

Copy destined for public channels on launch day. Everything in this
file is ready to paste; nothing needs edits beyond swapping the
final commit hash or GitHub URL if something moves.

Voice rules (from DESIGN.md):

- No marketing fluff. No "empowering", "seamless", "unlock", "best-
  in-class", "next-generation", "limitless".
- Shell-prompt CTA style where it lands naturally: `$ send_push`,
  `$ wrangler deploy`.
- Technical facts beat adjectives. "50,000 events/month for $29"
  beats "scale your delivery with confidence."
- Direct first person. "I built this because the existing ones
  annoyed me" beats "Designed for developers who demand control."

---

## Show HN

**Title**:
```
Show HN: edgepush – open source push notifications on Cloudflare Workers (AGPL)
```

**Body** (first comment submitted at the same time as the link):

```
I ship a few iOS apps and I've always hated the push infrastructure
options. Expo's EAS push is great until you want to own your own
data. OneSignal wants a credit card and an analytics pixel I didn't
ask for. Firebase only solves half the problem and makes Apple
devs write HTTP/2 + JWT signing themselves.

So I wrote direct APNs and FCM dispatchers, once, for each app.
Then I did it again. And again. Then I got tired of it.

edgepush is the thin, trusted push layer I wish existed. It runs
entirely on Cloudflare Workers + D1 + Queues + Durable Objects,
stores your APNs .p8 keys and FCM service account JSONs encrypted
in D1 with a per-deployment key, and gives you one HTTP endpoint
for iOS and Android.

Things I made sure it does:

- delivery event log (search by status, time, app) — you never lose
  track of a failed push
- active credential health probes: every credential is authenticated
  against Apple and Google every 24h and alerts you by email if your
  .p8 got revoked or your service account lost its role
- dead-letter queue with a replay script for transient outages
- retry with exponential backoff + failure webhooks (HMAC signed)
- per-app token bucket rate limit via a Durable Object
- one-command nightly D1 backup via GitHub Actions (encrypted)

Things it deliberately doesn't do:

- analytics. There's a delivery log, not a marketing dashboard.
- segmentation, campaigns, topics, in-app messaging. Use a real
  CDP for that.
- hand-holding. If you self-host, you run the cron. If you use the
  hosted tier, I run it.

License is AGPL-3.0 on the server + dashboard, MIT on the SDK and
CLI. You can embed @edgepush/sdk in a closed-source app without
AGPL obligations. If you want to run a commercial hosted edgepush
service, see COMMERCIAL.md.

Hosted at https://edgepush.dev — free tier is 10,000 events/mo, Pro
tier is $29/mo for 50,000 events/mo + 14-day retention + me
answering your email when something breaks. Self-host is free
forever with unlimited everything — one `wrangler deploy`, see
SELFHOST.md.

Not yet production-hardened. APIs may shift before 1.0. I'm
specifically looking for other indie devs who DIY push today to
send me feedback: hello@edgepush.dev or open an issue.

Code: https://github.com/akshitkrnagpal/edgepush
```

**Notes**:
- Submit the GitHub URL as the primary link, not edgepush.dev —
  HN readers click the code first.
- Post mid-week at 6–8 AM Pacific for best ranking odds.
- Don't edit the title after submission; HN penalizes it.
- Reply promptly to comments. First two hours are the whole ranking
  signal.

---

## Twitter / X thread

10-tweet thread. Line breaks in source are intentional — paste each
numbered block as a separate tweet.

```
1/ I got tired of writing direct APNs HTTP/2 + FCM OAuth2 code for
every iOS app I ship.

Today I'm launching edgepush: one HTTP endpoint for iOS + Android
push, running on Cloudflare Workers, storing YOUR credentials
encrypted in YOUR D1.

AGPL. Self-host or use the hosted tier.
```

```
2/ Every other push service makes you click around Apple Developer
portal, download a .p8, and upload it through a form.

edgepush does the same thing, but the form is part of an open
source dashboard you can run on your own Cloudflare account.
```

```
3/ The killer feature isn't sending push — sending push is solved.

It's catching credential decay.

edgepush probes every stored .p8 against Apple every 24h and FCM
service accounts against Google the same way. If your key gets
revoked, you get an email before your users notice.
```

```
4/ Delivery event log, retry queue, dead-letter queue, failure
webhooks, per-app rate limiting, nightly encrypted D1 backup via
GitHub Actions.

The operator runbook (OPERATOR.md) has an actual incident-response
playbook with copy-pasteable wrangler commands.
```

```
5/ License:

- Server + dashboard: AGPL-3.0
- SDK + CLI: MIT (embed in closed-source apps, no obligations)

If you want to run a commercial hosted edgepush without AGPL, email
me for a commercial license. Most users never need one.
```

```
6/ Hosted tier at edgepush.dev:

- Free: 1 app, 10K events/mo, 7-day log retention
- Pro: $29/mo, 3 apps, 50K events/mo, 14-day retention, priority
  email support from me personally

No credit card for Free. Pro is one Stripe Checkout away.
```

```
7/ Self-host is unlimited. Literally.

Clone the repo, create D1/KV/Queues, set 4 secrets, run two
wrangler deploys (api + dashboard). HOSTED_MODE=false means no
plan gates, no billing, no retention cron. It's your infrastructure.

Full guide: SELFHOST.md in the repo.
```

```
8/ Stack:

- Cloudflare Workers (API + dashboard via OpenNext)
- D1 for data, KV for hot cache, Queues for dispatch, Durable
  Objects for rate limiting
- Better Auth with GitHub OAuth
- Stripe Checkout on the hosted tier only
- Drizzle ORM, Hono, Next.js, React Query
```

```
9/ This is v0.2. Working end to end but not yet production-hardened.

What's in v0.2 that Expo Push Service doesn't do: rich notifications
with images, apns-collapse-id, fine-grained push types (voip,
location, complication), absolute notification expiration. The full
APNs and FCM payload surface, no proprietary token wrapper.

I'm looking for indie devs who DIY push today to send me feedback.
hello@edgepush.dev or open an issue.
```

```
10/ Code: https://github.com/akshitkrnagpal/edgepush
Hosted: https://edgepush.dev
```

**Notes**:
- Pin the thread.
- Quote-retweet the first reply as a boost mid-day if engagement
  stalls.
- No GIFs, no stock photos. Attach one screenshot of the `recent
  deliveries` panel on a tweet showing the actual log to tweet #4.

---

## r/iOSProgramming post

**Title**:
```
I built an open source push notification service on Cloudflare Workers because I was tired of the Apple certificate dance (AGPL, free hosted tier)
```

**Body**:

```
Every other push service I've tried (Expo, OneSignal, Firebase,
Knock, Courier) makes you write your own APNs JWT signing or click
around the Apple Developer portal once per app. I ship 2-4 iOS
apps a year and the combined Apple-portal time was adding up.

edgepush is the thing I wished existed:

- You upload your APNs .p8 once through a dashboard
- The key gets encrypted with AES-GCM before it touches D1
- A cron job probes the key against Apple every 24h and emails you
  if Apple starts rejecting it (revoked key, wrong team ID, etc.)
- You get one HTTP API that speaks both iOS and Android
- SDK + CLI are MIT, so you can embed them anywhere

Running it costs me basically nothing because it's all on
Cloudflare Workers (D1, KV, Queues, Durable Objects). The hosted
tier at edgepush.dev is free for 10K events/month and $29/mo for
50K.

If you'd rather run it on your own CF account: clone, create the
resources, `wrangler deploy`. The self-host docs are in the repo
(SELFHOST.md) and I tried to make them honest about what goes
wrong.

The whole thing is AGPL-3.0. I'm looking for other indie iOS devs
who DIY push or hate their current push provider to send me
feedback — what's missing, what's confusing, what I should build
next.

Code: https://github.com/akshitkrnagpal/edgepush
Hosted: https://edgepush.dev

Happy to answer questions about the architecture, Apple cert
handling, or anything else.
```

---

## r/reactnative post

**Title**:
```
edgepush — open source push on Cloudflare, one API for iOS and Android, BYO credentials
```

**Body**:

```
I ship React Native apps and always end up in one of two painful
places with push notifications:

1. Use Expo's EAS push, which works great but locks your delivery
   data inside Expo.
2. Roll your own APNs + FCM dispatch and maintain HTTP/2 + JWT code
   across every project.

edgepush is my third option. It's an open source push service that
runs on Cloudflare Workers, stores your APNs .p8 and FCM service
account JSON encrypted, and gives you one HTTP endpoint:

```ts
import { EdgePush } from "@edgepush/sdk";

const edge = new EdgePush({ apiKey: "..." });

await edge.send({
  to: deviceToken,
  platform: "ios", // or "android" — auto-inferred from token
  title: "build passed",
  body: "deploy is live",
});
```

Things that matter for RN specifically:

- The SDK is MIT — you can pull it into your Expo or bare RN app's
  backend without worrying about AGPL
- Tokens auto-infer platform from format (64-hex = iOS, else FCM)
- Delivery receipts are queryable per-message, or you set a
  webhook and forget
- Failed sends surface with the exact APNs/FCM reason code, not a
  generic "failed" status

Free hosted tier at edgepush.dev is 10K events/month. Pro is $29/mo
for 50K. Self-host is free forever with unlimited everything.

AGPL on the server + dashboard, MIT on the SDK. If AGPL scares you
for a commercial product, the SDK you embed in your backend is MIT
and your code stays yours.

Repo: https://github.com/akshitkrnagpal/edgepush

Looking for feedback from RN devs who've built and shipped push
before. DM or email hello@edgepush.dev.
```

---

## Cloudflare Discord #workers post

```
Hey folks — just launched edgepush, an open source push
notification service that lives entirely on Workers + D1 + KV +
Queues + Durable Objects.

https://github.com/akshitkrnagpal/edgepush

Built it because every existing push service either wants me to
hand over my APNs keys to a third party or doesn't exist as a
self-hostable thing. This one is AGPL, runs on your own CF account
via `wrangler deploy`, and keeps encrypted credentials in your own
D1.

Stack details for anyone curious:

- Hono for the API routes
- Drizzle + D1 for data, with composite indexes on the messages
  table for the paginated event log
- Cloudflare Queues for async dispatch with a DLQ consumer that
  logs every dead-letter to a worker_errors table
- Durable Objects for per-app rate limiting (token bucket)
- Scheduled handlers for hourly credential health probes and the
  daily operator digest
- Next.js + OpenNext for the dashboard, deployed as a separate
  Worker
- Better Auth with GitHub OAuth
- Jose for JWT signing (APNs), RSA via Web Crypto for FCM OAuth2

No node_compat tricks, no Node-only libraries, no server state that
doesn't live in D1/KV/DO. Runs at the CF free tier limits until you
have real traffic.

If anyone wants a reference for "running a real product on CF
Workers without any non-CF infrastructure," this is one.

Happy to answer questions about the architecture or any of the
weird edge cases I hit (e.g., how to verify a Stripe webhook
without the stripe-node package, which pulls in too much for
Workers).
```

---

## Launch day runbook

The operator version of the above: what order to do things in on
the day you actually launch.

### T-24h

- [ ] Run `bun scripts/operator/preflight.ts --remote` and fix any
      ✗ items.
- [ ] Run the D1 backup workflow manually from the GitHub Actions
      tab. Verify the artifact exists and the decryption procedure
      works on a test restore.
- [ ] Read through OPERATOR.md end to end. Make sure every
      copy-pasteable command in the incident response section is
      actually runnable from your terminal.
- [ ] Flip `HOSTED_MODE=true` in `wrangler.jsonc`, re-deploy the
      API Worker. Test that `/v1/send` returns a plan_exceeded
      error when the configured free-tier user goes over 10K
      events/mo.
- [ ] Test the Stripe flow end to end in live mode with a real
      card (use your own).

### T-1h

- [ ] Open OPERATOR.md in a browser tab.
- [ ] Have the kill-switch command copied to your clipboard (you
      don't want to be grepping for it at 2am).
- [ ] Refresh the edgepush.dev dashboard, sign in, verify you can
      create an app and send a test push. Screenshot it for Twitter.
- [ ] Load this file in a separate tab so you can paste the drafts.

### T-0 (launch)

1. Submit the Show HN link first (from this file's Show HN
   section). The first comment is the actual announcement, post
   it within 30 seconds of the link landing.
2. While HN is processing, post the Twitter thread. Pin it.
3. Wait 15 minutes, then post to r/iOSProgramming. Waiting avoids
   "everyone posting everywhere at once" looking like a spam pattern.
4. Another 15 minutes, post to r/reactnative.
5. Another 15 minutes, post in Cloudflare Discord #workers.

### T+1h — T+6h

- [ ] Reply to every HN comment within 10 minutes for the first
      hour. This matters for ranking.
- [ ] Watch the edgepush.dev dashboard for real signups. Screenshot
      the first real customer's first real push if you can.
- [ ] If the site catches a real load spike, `wrangler tail` the
      API Worker to watch for 5xx patterns.
- [ ] If anything goes sideways, flip the kill switch, fix it, and
      post an update comment on the HN thread. Users forgive an
      incident during launch if you're transparent about it.

### T+24h

- [ ] Check the operator digest email from the first 24h.
- [ ] Write a "how launch day went" thread or blog post with real
      numbers (HN position, signups, pro upgrades if any, bugs
      found). Honest retrospectives get shared more than polished
      launch announcements.

---

## Pricing copy polish notes

The pricing page (`apps/web/src/app/pricing/page.tsx`) already follows
DESIGN.md voice rules — no marketing fluff in the current copy. Don't
rewrite it for launch day unless something specific is confusing:

- Free tier description: "edgepush.dev hosted trial" — signals this
  is a trial, not a permanent free plan, without using the word
  "trial" in a way that implies a time limit.
- Pro tier description: "for indie shippers running a few apps" —
  names the target user explicitly. Not "for growing teams" or
  "for scale-ups".
- Self-host tier description: "agpl-3.0 — run it on your own
  cloudflare account" — license first, not a sell line.
- Feature rows are facts, not benefits. "14-day log retention" not
  "See every delivery with confidence".

If you feel tempted to change any of this on launch day to "make it
more compelling," stop. DESIGN.md voice is the whole identity
signal for why edgepush looks different from every other push
service. Don't blunt it under launch pressure.
