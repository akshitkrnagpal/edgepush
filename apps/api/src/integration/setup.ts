/**
 * Integration test setup. Runs before every test file inside the
 * workerd pool. Applies D1 migrations so the schema exists.
 */

import { applyD1Migrations, env } from "cloudflare:test";

export async function setup() {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
}
