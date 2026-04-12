## What

<!-- One sentence: what does this PR do? -->

## Why

<!-- What problem does it solve? Link to an issue if one exists. -->

## How to test

<!-- Steps a reviewer can follow to verify. -->

## Checklist

- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm test` passes (70+ unit tests)
- [ ] `pnpm build` passes
- [ ] No new em dashes in prose (project style rule)
- [ ] If this touches the API schema: SDK type in `packages/sdk/src/types.ts` mirrors `packages/shared/src/messages.ts`
- [ ] If this adds a new queue/binding: documented in SELFHOST.md, README, /docs/self-host, /selfhost
