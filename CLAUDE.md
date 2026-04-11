# edgepush

## Design System
Always read `DESIGN.md` before making any visual or UI decisions.
All font choices, colors, spacing, border radius, motion, and aesthetic direction are defined there.
Do not deviate without explicit user approval.
In QA or review mode, flag any code that doesn't match DESIGN.md.

Key rules worth remembering without re-reading:
- Dark-only. No light mode.
- One accent: signal orange `#FF6B1A`. Never cyan, emerald, purple, violet, or gradient text.
- Display type is JetBrains Mono (yes, for hero headlines too). Body is Satoshi. Never Inter, Geist, Roboto.
- Square-first border radius (0–2px). No `rounded-full` pills for primary CTAs, no `rounded-xl` cards.
- Status uses `● ○` characters in text, not icons.
- CTAs read like shell prompts: `$ sign_in`, `$ send_push`.
