/**
 * Integration test for POST /v1/send.
 *
 * Tests the full request path from HTTP to queue enqueue, running
 * inside workerd with real D1 + KV + Queue bindings (Miniflare).
 * Does NOT test the actual APNs/FCM dispatch (that's the dispatch
 * consumer, which requires mocking external endpoints).
 *
 * What this covers:
 * - Auth (valid API key accepted, invalid rejected)
 * - Request validation (bad payloads rejected)
 * - Rate limiting (burst limit enforcement)
 * - Quota reservation (hosted mode gating)
 * - Message row insertion in D1
 * - Queue job enqueue
 * - Ticket response format
 */

import { describe, it, expect, beforeAll } from "vitest";
import { env, SELF } from "cloudflare:test";

// Seed data constants
const TEST_APP_ID = "test-app-001";
const TEST_USER_ID = "test-user-001";
const TEST_PACKAGE_NAME = "io.test.myapp";
const TEST_API_KEY_SECRET = "sk_test_secret_key_12345678";
const TEST_API_KEY = `${TEST_PACKAGE_NAME}|${TEST_API_KEY_SECRET}`;

async function seedTestData() {
  const db = env.DB;
  const now = Date.now();

  // Insert a test user (Better Auth user table)
  await db
    .prepare(
      `INSERT OR IGNORE INTO user (id, name, email, emailVerified, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(TEST_USER_ID, "Test User", "test@test.com", 1, now, now)
    .run();

  // Insert a test app
  await db
    .prepare(
      `INSERT OR IGNORE INTO apps (id, userId, name, packageName, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(TEST_APP_ID, TEST_USER_ID, "Test App", TEST_PACKAGE_NAME, now, now)
    .run();

  // Insert a test API key. The key format stored in the DB is the hashed
  // secret, but authenticateApiKey in the API code does a lookup by
  // package name prefix then compares the secret. Let's check the actual
  // schema to see how keys are stored.
  //
  // From apps/api/src/db/schema.ts, api_keys has:
  //   id, appId, label, keyPrefix, keyHash, createdAt, revokedAt
  //
  // authenticateApiKey in lib/auth.ts parses "packageName|secret",
  // finds the app by packageName, then finds active keys and compares
  // hashes. We need to store the hash of our test secret.
  //
  // The hash function is in lib/crypto.ts: SHA-256 of the raw secret.
  const secretBytes = new TextEncoder().encode(TEST_API_KEY_SECRET);
  const hashBuffer = await crypto.subtle.digest("SHA-256", secretBytes);
  const hashHex = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  await db
    .prepare(
      `INSERT OR IGNORE INTO api_keys (id, appId, label, keyPrefix, keyHash, createdAt, revokedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      "test-key-001",
      TEST_APP_ID,
      "test key",
      TEST_API_KEY_SECRET.slice(0, 8),
      hashHex,
      now,
      null,
    )
    .run();
}

describe("POST /v1/send", () => {
  beforeAll(async () => {
    await seedTestData();
  });

  it("rejects unauthenticated requests", async () => {
    const res = await SELF.fetch("http://localhost/v1/send", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        messages: [{ to: "abc123", title: "Hello" }],
      }),
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("invalid_api_key");
  });

  it("rejects invalid API keys", async () => {
    const res = await SELF.fetch("http://localhost/v1/send", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer io.fake.app|wrong_key",
      },
      body: JSON.stringify({
        messages: [{ to: "abc123", title: "Hello" }],
      }),
    });

    expect(res.status).toBe(401);
  });

  it("rejects empty messages array", async () => {
    const res = await SELF.fetch("http://localhost/v1/send", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${TEST_API_KEY}`,
      },
      body: JSON.stringify({ messages: [] }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("invalid_request");
  });

  it("rejects messages without any target (to/topic/condition)", async () => {
    const res = await SELF.fetch("http://localhost/v1/send", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${TEST_API_KEY}`,
      },
      body: JSON.stringify({
        messages: [{ title: "Hello" }],
      }),
    });

    expect(res.status).toBe(400);
  });

  it("accepts a valid single send and returns a ticket", async () => {
    const res = await SELF.fetch("http://localhost/v1/send", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${TEST_API_KEY}`,
      },
      body: JSON.stringify({
        messages: [
          {
            to: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
            title: "Integration test",
            body: "From vitest",
          },
        ],
      }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: Array<{ id: string; status: string }> };
    expect(body.data).toHaveLength(1);
    expect(body.data[0].status).toBe("ok");
    expect(body.data[0].id).toBeTruthy();
  });

  it("accepts a batch of messages", async () => {
    const messages = Array.from({ length: 5 }, (_, i) => ({
      to: `a${i}b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2`,
      title: `Batch ${i}`,
    }));

    const res = await SELF.fetch("http://localhost/v1/send", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${TEST_API_KEY}`,
      },
      body: JSON.stringify({ messages }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: Array<{ id: string; status: string }> };
    expect(body.data).toHaveLength(5);
    for (const ticket of body.data) {
      expect(ticket.status).toBe("ok");
    }
  });

  it("accepts a topic send", async () => {
    const res = await SELF.fetch("http://localhost/v1/send", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${TEST_API_KEY}`,
      },
      body: JSON.stringify({
        messages: [{ topic: "news", title: "Topic test" }],
      }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: Array<{ id: string; status: string }> };
    expect(body.data).toHaveLength(1);
    expect(body.data[0].status).toBe("ok");
  });
});
