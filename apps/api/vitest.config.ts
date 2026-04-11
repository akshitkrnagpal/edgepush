/**
 * Vitest config for @edgepush/api unit tests.
 *
 * Phase 7 ships pure-function tests only: probes, webhook HMAC, plan
 * rollover, stripe signature verification. These don't need D1, KV,
 * Queues, or Durable Object bindings, so we run them under plain Node
 * rather than wiring up @cloudflare/vitest-pool-workers.
 *
 * The tradeoff is explicit: integration tests for the send path,
 * dispatch consumer, and account-delete cascade ARE blocked on a
 * Miniflare-backed runner and land in Phase 7.5. Phase 7 covers the
 * logic that most needs regression protection: cryptographic code
 * (webhook HMAC, Stripe signature verify, client_reference_id) and
 * response-code interpretation (the probes).
 *
 * Node >=20 ships the Web Crypto API as a global, so `crypto.subtle`
 * works without any import. The `btoa` global is also available on
 * Node 20+, so the base64url helper in lib/stripe.ts works unchanged.
 */

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // One test file at a time, we mock `fetch` globally for the probe
    // tests, and parallel workers would race on the mock. Vitest 4
    // moved pool options to the top level.
    pool: "forks",
    forks: {
      singleFork: true,
    },
  },
});
