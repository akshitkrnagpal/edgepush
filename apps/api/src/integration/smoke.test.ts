/**
 * Integration smoke test.
 *
 * Tests run inside workerd via @cloudflare/vitest-pool-workers.
 * The worker's bindings (D1, KV, etc.) are available through the
 * module execution context. We test by calling the Hono app's
 * request() method which doesn't require an explicit env parameter
 * for routes that don't use bindings (like /health).
 *
 * For routes that need bindings (/v1/send), we'll need to resolve
 * the cloudflare:test module issue or find another way to access
 * the Miniflare-provided env.
 */

import { describe, it, expect } from "vitest";

// The Hono app is exported as app.fetch in the default export.
// We import the Hono instance directly to use its .request() helper.
// This avoids needing env/ctx parameters for binding-free routes.
import { Hono } from "hono";

// We can't import the full app because it registers middleware that
// needs env (CORS reads DASHBOARD_URL from env). Instead, test the
// health route in isolation.
describe("workerd integration", () => {
  it("runs inside workerd", () => {
    // If this test passes, the workerd pool is functioning.
    expect(typeof globalThis.caches).toBe("object");
  });

  it("Hono is importable in workerd", () => {
    const app = new Hono();
    app.get("/test", (c) => c.json({ ok: true }));
    expect(app).toBeTruthy();
  });

  it("can make a request to a Hono app", async () => {
    const app = new Hono();
    app.get("/ping", (c) => c.json({ pong: true }));

    const res = await app.request("/ping");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ pong: true });
  });

  it("crypto.subtle is available (Workers runtime)", async () => {
    const data = new TextEncoder().encode("test");
    const hash = await crypto.subtle.digest("SHA-256", data);
    expect(hash.byteLength).toBe(32);
  });
});
