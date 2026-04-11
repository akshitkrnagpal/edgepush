# Design System, edgepush

Terminal-native, warmed up. A CLI tool with a web face.

## Product Context

- **What this is:** Open source alternative to Expo Push Notification Service. One API to send native iOS (APNs) and Android (FCM) push notifications, running on Cloudflare Workers, with bring-your-own credentials encrypted in D1.
- **Who it's for:** Backend and infrastructure developers who ship mobile apps and want push infrastructure they can self-host, audit, and stop paying for. Comfortable with a `wrangler deploy`, prefer open source, allergic to vendor lock-in.
- **Space/industry:** Developer infrastructure. Adjacent to Expo, Knock, OneSignal, Courier for push; adjacent to Resend, Turso, Upstash, Fly.io for the Cloudflare/edge-native dev-tool aesthetic.
- **Project type:** Hybrid. Marketing landing site + authenticated developer dashboard (apps, credentials, tokens, audit log, webhooks, test send).
- **Reference sites used in research:** docs.expo.dev/push-notifications, knock.app, onesignal.com, resend.com, turso.tech.

## Aesthetic Direction

- **Direction:** Terminal-native, warmed up. Monospace is the primary typographic voice, not just for code. Feels like a handcrafted CLI tool that grew a web face. Warmed by grain, one saturated non-category accent, and a humanist body typeface so it never reads as cold or student-project.
- **Decoration level:** Intentional. Subtle film grain overlay on pure black. Thin 1px rules instead of filled cards. Square corners (max 2px radius). ASCII chrome (`│ ├ ─ ● ○`) as UI dividers and status markers. No blobs, no gradient backgrounds, no decorative glow orbs.
- **Mood:** Confident, technical, opinionated, warm enough to not feel like a terminal screenshot. Edgepush reads as a tool a senior engineer built for themselves and then shared, not as a SaaS product with a marketing team.
- **References:** Charm.sh, Fly.io, Ghostty, early Linear, Resend (for pure-black discipline), Turso (for edge-native posture).

## Typography

Two voices, one technical and one human, with nothing in between. The contrast IS the system.

- **Display / Hero:** `JetBrains Mono` at 800 (ExtraBold). Huge sizes (80–120px). The monospace IS the headline. This is the signature move.
- **Body:** `Satoshi` (Indian Type Foundry, free via Fontshare). Humanist grotesque. Warm, generous, not overused. Pairs with mono by contrast, not imitation. **Never Inter, Geist, Roboto, Helvetica, Arial, or Open Sans**, too saturated in the category.
- **UI / Labels / Chrome:** `JetBrains Mono` at 500 (Medium), uppercase, tracked `0.10–0.14em`, small (10–12px). Every small label in the UI should feel like a terminal flag or header.
- **Data / Tables:** `JetBrains Mono` with `font-feature-settings: "tnum"` for tabular numerals. Same face as display, reinforces the voice.
- **Code:** `JetBrains Mono` Regular. Same font everywhere, no per-context switching.
- **Loading strategy:** Google Fonts for JetBrains Mono (`?family=JetBrains+Mono:wght@400;500;700;800`), Fontshare for Satoshi (`https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700,900`). Both allow CDN. Self-host later if we want zero-third-party.

### Type Scale (mono display + sans body)

| Role | Font | Weight | Size | Line height | Letter spacing |
|---|---|---|---|---|---|
| display-2xl | JetBrains Mono | 800 | clamp(72px, 9vw, 132px) | 0.90 | -0.045em |
| display-xl | JetBrains Mono | 800 | 72px | 0.95 | -0.035em |
| display-lg | JetBrains Mono | 700 | 48px | 1.00 | -0.025em |
| display-md | JetBrains Mono | 700 | 32px | 1.05 | -0.02em |
| display-sm | JetBrains Mono | 700 | 24px | 1.15 | -0.015em |
| body-lg | Satoshi | 400 | 18px | 1.55 | -0.005em |
| body-md | Satoshi | 400 | 15px | 1.55 | -0.005em |
| body-sm | Satoshi | 400 | 13px | 1.5 | 0 |
| ui-label | JetBrains Mono | 500 | 11px | 1.4 | 0.12em (uppercase) |
| ui-micro | JetBrains Mono | 500 | 10px | 1.4 | 0.14em (uppercase) |
| data-md | JetBrains Mono | 400 | 13px tnum | 1.6 | 0 |
| code-md | JetBrains Mono | 400 | 13px | 1.6 | 0 |

## Color

One accent. Signal orange. Everything else is black, bone, and grain.

- **Approach:** Restrained. The palette is black + bone + one saturated accent. Color is rare and meaningful, every orange element is a signal, never decoration.
- **Philosophy:** No gradient accent text. No cyan. No emerald. No purple. No violet. The category is saturated with those; we take the gap.

### Core Palette

| Token | Hex | Usage |
|---|---|---|
| `--bg` | `#000000` | Pure black. Page background. |
| `--surface` | `#0A0A0A` | Panels, code blocks, log viewer, cards. Elevation comes from 1px rules, not fills. |
| `--surface-2` | `#111111` | Table header rows, secondary panels. |
| `--rule` | `#1A1A1A` | Thin 1px dividers (default). |
| `--rule-strong` | `#262626` | Panel borders, visible boundaries. |
| `--text` | `#F5F3EE` | Primary text. Bone white, warmer than `#FFFFFF`. Reads as paper, not screen. |
| `--muted-strong` | `#9A9A9A` | Secondary text, body copy on dark. |
| `--muted` | `#6B6B6B` | Tertiary, labels, timestamps. |
| `--accent` | `#FF6B1A` | Signal orange. THE brand color. One CTA per view, highlighted words, status bullets, active nav. |
| `--accent-hover` | `#FF8A42` | Hover state only. |
| `--accent-dim` | `#B54A10` | Pressed/active state, rarely used. |

### Semantic (status) colors

Muted and mono-adjacent. They appear only in status contexts (log lines, badges, stat deltas), never in marketing.

| Token | Hex | Usage |
|---|---|---|
| `--success` | `#6BCB77` | `● delivered` |
| `--warning` | `#F0DB4F` | `● retry`, `● rate_limited` |
| `--error` | `#FF4F4F` | `● failed`, `● invalid_token` |
| `--pending` | `#6B6B6B` | `○ queued` (uses hollow dot) |

### Dark mode

**There is no light mode.** edgepush is dark-only by design, it matches the audience (developers who live in dark terminals) and the positioning (infrastructure, not consumer). Do not add a light mode without explicit product discussion.

### Decoration

- **Grain overlay:** SVG fractal-noise filter, `opacity: 0.06`, `mix-blend-mode: overlay`, `position: fixed; inset: 0; pointer-events: none`. Adds warmth to pure black without being visible as texture.
- **No shadows.** Elevation is conveyed by 1px rules, not blur.
- **No gradients** anywhere. Orange never fades to another color. Black never fades to gray.

## Spacing

4px base. Dense by default. Breathing only where it matters (hero section, between major blocks).

| Token | Value | Usage |
|---|---|---|
| `space-2xs` | 2px | hairline |
| `space-xs` | 4px | icon-to-label, badge padding-y |
| `space-sm` | 8px | input padding-y, tight rows |
| `space-md` | 12px | default cell padding |
| `space-lg` | 16px | card padding, form row gap |
| `space-xl` | 24px | section-internal gap |
| `space-2xl` | 32px | between card groups |
| `space-3xl` | 48px | between major content blocks |
| `space-4xl` | 72px | between page sections |
| `space-5xl` | 96px | hero top/bottom |

- **Density target for dashboard:** a real data table should show ≥12 rows above the fold on a 1440×900 viewport. Row height: ~40px. Cell padding: 10px 14px.
- **Marketing pages** get more breathing room (`space-4xl` / `space-5xl` between sections), but never feel spacious, always feel purposeful.

## Layout

- **Approach:** Grid-disciplined with asymmetric hero. Dashboard feels like tmux panes. Landing hero breaks the grid with a typographic scale jump.
- **Max content width:** 1440px for dashboard, 1200px for marketing content sections (code/prose), 1440px for the hero.
- **Grid:** 12 columns for marketing, 16 columns for dashboard. 32px gutter.
- **Border radius:** Square-first. `--radius-sm: 0px`, `--radius-md: 2px`, `--radius-lg: 4px`. **No pill buttons** for primary CTAs. No `rounded-xl` cards. No `rounded-full` anywhere except avatar/status dots.
- **Chrome characters:** Use `│ ├ ─ └ ┌ ┐` for UI dividers and nav active-state markers. Use `● ○` for status dots (never emoji, never SVG icons for status). Use `▲ ▼` for stat deltas. Use `$` as a prefix for primary CTAs (`$ sign_in`, `$ send_push`) to reinforce the shell-prompt voice.
- **Nav:** Top nav has thin 1px bottom rule, monospace uppercase labels, active state prefixed with `├ ` in accent orange.

## Motion

- **Approach:** Minimal-functional plus one living moment.
- **Rule:** Dashboard transitions are instant or near-instant. Dev tools should feel fast, not choreographed. No page transitions, no entrance animations on scroll, no stagger.
- **The one living moment:** Landing hero has a streaming log viewer that tails fake push events (`2026-04-11T04:25:12.847Z io.acme.pos ● delivered 192ms`) to signal realtime infrastructure. This is the only expressive motion on the marketing site.
- **Pulse:** The "open source alpha / free forever" status chip pulses in accent orange (`box-shadow` pulse, 1.8s ease-out infinite). Nothing else pulses.
- **Easing:** enter `ease-out`, exit `ease-in`, move `ease-in-out`.
- **Duration:** micro 50–100ms (hover, focus), short 150–250ms (panel mount), medium 250–400ms (rarely). No duration over 400ms.

## Components

### Buttons

Square corners (max `2px` radius). Mono label. Usually prefixed with `$` for primary actions.

- **Primary (`btn-primary`)**, `background: #F5F3EE; color: #000;`. The default CTA. Hover: `background: #FF6B1A;`.
- **Accent (`btn-accent`)**, `background: #FF6B1A; color: #000;`. For destructive-adjacent or high-signal actions (`send push`, `rotate key`).
- **Ghost (`btn-ghost`)**, `background: transparent; border: 1px solid #262626; color: #F5F3EE;`. Hover: `border-color: #F5F3EE;`.
- **Disabled:** `opacity: 0.4; pointer-events: none;`. Never grey-out with a different color.
- **Size:** Default `padding: 10px 18px; font-size: 12px;`. Compact `8px 14px; font-size: 11px;`.

### Form inputs

- Transparent background, 1px border in `--rule-strong`, mono value text (API keys, package names, URLs are all monospace content).
- Label above the input, 10–11px mono uppercase, `--muted`.
- Focus: border becomes `--accent` (orange). No glow, no box-shadow.
- Error: border `--error`, helper text in `--error`.

### Status badges

```
● DELIVERED    border + text #6BCB77 (success)
● RETRY 1/3    border + text #F0DB4F (warning)
● FAILED       border + text #FF4F4F (error)
○ QUEUED       border + text #6B6B6B (muted, hollow dot)
```

1px border, mono uppercase, tracked 0.12em, `padding: 4px 10px`. Dot character is part of the text content, not a separate icon element.

### Panels

1px border in `--rule-strong`, `background: #0A0A0A`. Header row has a bottom border in `--rule`, mono uppercase label, prefixed with `├ ` in orange. No rounded corners.

### Tables

Mono font, `font-feature-settings: "tnum"`. Header row `background: #050505`, mono uppercase labels in `--muted`. Rows divided by 1px `--rule`. No zebra striping. IDs in `--text`, everything else in `--muted-strong`. Status column uses `● / ○` dots.

### Log stream

The signature component. Terminal-style block with fixed-width columns:
```
[timestamp]  [app]         [id]            [● status]     [metadata]
```
Font: JetBrains Mono 12.5px, line-height 1.9. Dots are colored per status. Timestamps in `--muted`, app names in `--text`, ids in `--muted`, metadata in `--muted-strong`.

## Voice and copy

The design has a voice and so does the copy. Both are technical, direct, no marketing fluff.

- **CTAs are shell prompts:** `$ sign_in_with_github`, `$ send_push`, `$ rotate_key`, `$ create_app`.
- **Section labels are `tail -f`, `grep`, `ls`** where it lands naturally. Don't force it.
- **Never say "empowering", "effortless", "seamlessly", "best-in-class", "next-generation".** edgepush is a tool, not a pitch deck.
- **Do say:** "MIT", "BYO credentials", "self-host", "one `wrangler deploy`", "encrypted in D1", "no vendor lock-in". These are the actual selling points and they read as technical facts.

## Anti-patterns (never do these)

- Purple or violet gradients as an accent.
- Cyan or emerald accent colors (the category is full; we chose orange deliberately).
- Gradient accent text (`bg-clip-text text-transparent`), we did this before, it's generic.
- Rounded-full pill buttons for primary CTAs.
- Centered hero text.
- Three-column feature grid with circular colored icons.
- Drop shadows for elevation.
- Decorative blobs, glow orbs, 3D spheres.
- Generic SaaS marketing copy ("designed for X", "built for Y", "empowering teams").
- Light mode.
- Inter, Geist, Roboto, Helvetica, Arial, Open Sans, Lato, Montserrat, Poppins.

## Implementation notes

- **Current state:** `apps/web/src/app/globals.css` has a Geist setup that needs to be replaced. `body { font-family: Arial, Helvetica, sans-serif; }` contradicts the Geist imports, delete that entirely when migrating.
- **Tailwind v4:** the codebase uses `@tailwindcss/postcss` with `@theme inline`. Define the tokens in the `@theme inline` block so they're available as Tailwind utilities (`bg-bg`, `text-accent`, `font-mono`, `font-sans`).
- **Migration scope:** The landing page (`apps/web/src/app/page.tsx`) currently uses `rounded-full` CTAs, `from-emerald-400 to-cyan-400` gradient text, and rounded-xl cards. These all need to go when this system lands. A separate PR should do the migration. DO NOT silently rewrite the app while this file is being created.

## Design artifacts

- **Preview page (HTML specimen):** `/tmp/edgepush-design-preview-1775867327.html`, full system rendered with real components. Open in a browser to see it live. This is not canonical; DESIGN.md is canonical.
- **Research screenshots:** `/tmp/edgepush-research/{01-expo, 02-knock, 03-onesignal, 04-resend, 05-turso}.png`, competitive landscape that informed the direction.

## Decisions Log

| Date | Decision | Rationale |
|---|---|---|
| 2026-04-11 | Terminal-native aesthetic with JetBrains Mono display | Research showed the whole category converges on dark + grotesque sans + gradient accent. Mono-as-display is unclaimed in the push notification space and matches edgepush's "CLI tool with a web face" positioning. |
| 2026-04-11 | Signal orange `#FF6B1A` as sole accent | Cyan, emerald, and purple are saturated in the Cloudflare-adjacent dev tool category. Orange lands in a gap, evokes the push notification badge literally, and has zero visual overlap with Turso, Upstash, Resend, Vercel. |
| 2026-04-11 | Satoshi for body, not Geist/Inter | Geist and Inter are overused to the point of being invisible. Satoshi is free, warm, humanist, and adds a second voice that isn't just "a different grotesque". |
| 2026-04-11 | Dark-only, no light mode | Audience is developers on dark terminals; positioning is infrastructure. A light mode would dilute the voice and double the maintenance surface for no user benefit. Revisit only if a real user signal demands it. |
| 2026-04-11 | 4px base unit, dense dashboard | Users are backend/infra devs who want data density, not whitespace. A row should fit ≥12 entries above the fold on 1440×900. |
| 2026-04-11 | ASCII chrome (`│ ├ ─ ● ○`) for UI dividers and status | Handcrafted terminal identity that no direct competitor has. Small risk of rendering oddly on some fonts, mitigated by pinning JetBrains Mono. |
| 2026-04-11 | Square-first border radius (0–2px) | Rounded-xl cards and pill buttons are AI-slop table stakes now. Square corners are a deliberate departure that reinforces the terminal voice. |
