# Contributing to edgepush

PRs welcome. This doc covers the basics so your contribution can land
without ping-pong on stuff that's easy to fix up front.

## Quick orientation

edgepush is a pnpm workspace:

```
apps/web/         Marketing site (edgepush.dev). Landing, docs, pricing, legal.
apps/app/         Dashboard + embedded API (app.edgepush.dev). Self-hosters deploy this.
apps/api/         Optional Hono hot-path worker. Thin re-export of @edgepush/server.
packages/server/  Compiled API core. Hono app, routes, dispatch, crons, probes,
                  Drizzle schema + migrations.
packages/orpc/    oRPC router contract + zod schemas.
packages/sdk/     @edgepush/sdk, typed client for any fetch runtime.
packages/cli/     @edgepush/cli, terminal client. Bundles the SDK inline.
```

`SELFHOST.md` walks through setting up a local edgepush instance.
`CHANGELOG.md` lists what shipped in each version.
`DESIGN.md` is the visual design system. Read it before any UI work.

## Setup

```bash
git clone https://github.com/akshitkrnagpal/edgepush.git
cd edgepush
pnpm install
```

You'll need Node 20+ and pnpm 10+. The repo has `engines` enforcement.

## Before you push

Run all four gates locally. CI runs the same set; if it's green
locally it's almost certainly green in CI.

```bash
pnpm typecheck   # all packages
pnpm lint        # eslint
pnpm test        # vitest
pnpm build       # turbo build of every package that has one
```

If any of those fail, fix it. Don't `--no-verify` your way around a
failing hook.

## What to work on

The highest-leverage areas right now:

1. **Integration tests** for the send path, dispatch consumer, and
   account-delete cascade. 70 pure-function unit tests exist but no
   D1-backed integration tests yet. Vitest +
   `@cloudflare/vitest-pool-workers` is the path.
2. **Mobile SDK examples**: React Native, native iOS, native Android.
   The dashboard needs a real "here's how to use this from your app"
   section in `apps/app/src/app/docs/page.tsx`.
3. **DLQ replay UI** in the dashboard. Currently `replay-dlq.ts` is a
   terminal script. A button on `/dashboard/settings` → "Dead letters"
   that lists `worker_errors` with `kind='dlq'` and replays from the UI
   would save the operator a lot of `wrangler` time.
4. **Self-host troubleshooting**, if you hit a problem that isn't
   already in `SELFHOST.md`'s Troubleshooting section, open an issue
   with the fix.
5. **Email OTP sign-in for self-hosted.** The hosted tier uses GitHub
   OAuth, but self-hosters may want email OTP sign-in. Better Auth
   supports it, it just needs wiring up with a conditional UI on
   the sign-in page.

If you're planning anything large, open an issue first so we can talk
about scope before you write the code.

## Code style

- **No em dashes** in user-visible copy. They look AI-generated.
  Hyphens or sentence breaks are fine.
- **No emojis** anywhere in source files unless a maintainer
  explicitly asks. Same reason.
- **Status uses `●` and `○` text characters**, not SVG or emoji icons.
  Per `DESIGN.md`.
- **Square corners on UI**: `rounded-none` is the default. No
  `rounded-xl`, no `rounded-full` pills for primary CTAs.
- **One accent color**: signal orange `#FF6B1A` only. No cyan,
  emerald, purple, or gradient text. See `DESIGN.md` for the full
  palette.
- **Display type is JetBrains Mono**. Body type is Satoshi. Never
  Inter, Geist, or Roboto.

ESLint + Prettier defaults enforce most of the structural rules.
DESIGN.md and CLAUDE.md cover the visual ones.

## Commit messages

- Imperative mood: "Add X" not "Added X" or "Adds X".
- First line under 70 characters.
- Body wraps at ~72 characters.
- Explain the *why*, not the *what*, the diff shows the what.
- One logical change per commit. If you can describe two things in
  the same commit message, it's two commits.

## Licensing

edgepush is dual-licensed:

- `apps/api` (server) and `apps/app` (dashboard) are
  [AGPL-3.0-only](./LICENSE).
- `packages/sdk` and `packages/cli` are MIT.

Contributions to a package land under that package's license. There
is no CLA, your commit is your acceptance of the license terms for
the package you're contributing to.

If you're contributing to the server or dashboard and are uneasy
about the AGPL implications, see `COMMERCIAL.md` for the dual-license
rationale and the (rare) cases where someone would need a commercial
license.

## Reporting a security issue

Don't open a public issue for security bugs. Email
hello@edgepush.dev with the details and a way to reproduce. You'll
get a response within 48 hours.
