# Handoff: edgepush brand identity (icon + logo)

## Overview

This bundle delivers the **locked brand mark and wordmark** for edgepush, plus production-ready SVG assets and the wiring instructions to install them in the existing apps (`apps/web`, `apps/app`).

**Locked decisions:**
- **Icon (favicon, app icon):** `Mark A · Signal Dot` — a single solid orange disc on black.
- **Logo (wordmark):** `Wordmark W3 · edge ● push` — JetBrains Mono ExtraBold lowercase, with the orange signal dot replacing the visual divider between the two halves.

## About the design files

The files in `reference/` are **design references created in HTML** — a presentation canvas (`brand.html`) showing the marks at multiple sizes, in browser tabs, in dashboard nav, and in CLI splash. They are NOT production code to copy.

The task is to install the production SVGs (in this folder root) into the target codebases (`apps/web`, `apps/app`) following each app's existing conventions (Astro for the marketing site, Next.js for the dashboard).

## Fidelity

**High-fidelity.** Every dimension, color, font, and weight below is final. Match it exactly.

## Production assets (the only files to install)

All five live at the root of this handoff folder:

| File | Purpose | Notes |
|---|---|---|
| `favicon.svg` | Browser tab favicon | 64×64 viewBox, black bg, orange dot |
| `apple-touch-icon.svg` | iOS home-screen icon | 180×180 viewBox, black bg, orange dot |
| `icon-mark.svg` | Bare mark, transparent bg | Use anywhere the surface already provides bg color |
| `wordmark-light.svg` | "edge ● push" with bone ink | Use on dark surfaces (default) |
| `wordmark-dark.svg` | "edge ● push" with near-black ink | Use on light surfaces |

**Do NOT regenerate or restyle these.** They are the locked artifacts.

## Design tokens (must match `DESIGN.md` exactly)

```
--bg:     #000000   (pure black)
--text:   #F5F3EE   (bone)
--accent: #FF6B1A   (signal orange) — the dot
```

**Typography for the wordmark:**
- Family: `JetBrains Mono`
- Weight: `800` (ExtraBold)
- Case: lowercase
- Letter-spacing: `-0.045em`
- Line-height: `0.95`
- The orange dot diameter ≈ `0.40 × cap-height`
- Gap between "edge", dot, "push" ≈ `0.16em` on each side of the dot

## Mark construction (Icon A — Signal Dot)

- 64×64 conceptual grid
- Single `<circle cx="32" cy="32" r="14" fill="#FF6B1A" />`
- Dot diameter ≈ 44% of canvas (28/64)
- Clearance ring: keep r=22 from center clear of any other element when locking up
- **No outline. No gradient. No shadow. No glow.** One solid color, full stop.
- For favicon contexts (browser tab), include the black `<rect>` background so the dot reads against light browser chrome. For in-app contexts where the surface is already black, use `icon-mark.svg` (transparent).

## Wordmark construction (W3 — edge ● push)

In SVG: two `<text>` runs in JetBrains Mono 800 around a `<circle>` in `--accent`. See `wordmark-light.svg` and `wordmark-dark.svg` for the exact geometry — they're built on a 640×160 viewBox at 110px type, with the dot at r=22 centered on the optical baseline.

In HTML/CSS (for any dynamic rendering — e.g. nav header where the wordmark scales with the layout):

```html
<span class="wordmark">
  <span>edge</span>
  <span class="dot" aria-hidden="true"></span>
  <span>push</span>
</span>
```

```css
.wordmark {
  font-family: "JetBrains Mono", ui-monospace, monospace;
  font-weight: 800;
  letter-spacing: -0.045em;
  line-height: 0.95;
  display: inline-flex;
  align-items: center;
  gap: 0.16em;
  color: var(--text); /* or var(--bg) on light surfaces */
}
.wordmark .dot {
  width: 0.40em;
  height: 0.40em;
  border-radius: 50%;
  background: var(--accent);
  display: inline-block;
  flex-shrink: 0;
}
```

The CSS variant is preferred for in-app nav so the wordmark inherits the surrounding font-size. Use the SVGs for OG images, README badges, marketing hero, anywhere the size is fixed.

## Installation

### `apps/web` (Astro marketing site)

1. Copy `favicon.svg` and `apple-touch-icon.svg` to `apps/web/public/`.
2. In `apps/web/src/layouts/Base.astro` (the shared `<head>`), add:
   ```astro
   <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
   <link rel="apple-touch-icon" href="/apple-touch-icon.svg" />
   ```
3. Replace any existing text-only "edgepush" header logo with the CSS wordmark snippet above (or import `wordmark-light.svg` as an `<img>` if a fixed size is desired).

### `apps/app` (Next.js dashboard)

1. Copy `favicon.svg` and `apple-touch-icon.svg` to `apps/app/public/`.
2. Next.js 13+ App Router: rename to `apps/app/src/app/icon.svg` and `apps/app/src/app/apple-icon.svg` if you want Next to handle the link tags automatically. Otherwise use the manual `<link>` tags in the root layout's `<head>`.
3. Update the dashboard top-nav (`apps/app/src/app/page.tsx`, the `{/* Logo + version */}` block) to render the wordmark using the CSS pattern above. The mark should sit at ~20px height next to the wordmark text.

### CLI (`packages/cli`)

The CLI splash already prints `●` characters — just ensure the bullet next to "edgepush" in the splash header is rendered in `\x1b[38;2;255;107;26m` (truecolor for `#FF6B1A`) with a fallback to `\x1b[33m` (yellow/orange) on terminals without truecolor.

## Don'ts (from the design system)

- Never gradient the dot.
- Never outline the dot (a hollow ring reads as `○ queued` — wrong status).
- Never recolor (no purple, cyan, emerald — orange or nothing).
- Never add drop shadows or glow halos.
- Never pair the wordmark with any font other than JetBrains Mono ExtraBold.
- Never set the wordmark on a saturated background. It lives on `--bg` (#000) or `--text` (#F5F3EE).

## Reference files

`reference/brand.html` (open in a browser) is the full presentation canvas: mark explorations, wordmark variants, construction grid, in-context previews on browser tab + dashboard nav + CLI, and the don'ts panel. Treat it as the spec; don't ship it.

## Files in this bundle

```
design_handoff_brand/
├── README.md                  ← you are here
├── favicon.svg                ← install in apps/*/public/
├── apple-touch-icon.svg       ← install in apps/*/public/
├── icon-mark.svg              ← bare mark, transparent
├── wordmark-light.svg         ← for dark surfaces
├── wordmark-dark.svg          ← for light surfaces
└── reference/
    ├── brand.html             ← open this in a browser to see the spec
    ├── marks.jsx
    ├── app.jsx
    └── design-canvas.jsx
```
