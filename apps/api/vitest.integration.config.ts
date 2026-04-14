/**
 * Vitest config for integration tests.
 *
 * Uses @cloudflare/vitest-pool-workers to run tests inside workerd
 * with real D1, KV, Queue, and Durable Object bindings (simulated
 * by Miniflare).
 *
 * Run with: npx vitest run --config vitest.integration.config.ts
 */

import { defineConfig } from "vitest/config";
import { cloudflarePool } from "@cloudflare/vitest-pool-workers";

export default defineConfig({
  test: {
    include: ["src/integration/**/*.test.ts"],
    pool: cloudflarePool({
      wrangler: {
        configPath: "./wrangler.jsonc",
      },
      miniflare: {
        d1Databases: {
          DB: "./migrations",
        },
      },
    }),
  },
});
