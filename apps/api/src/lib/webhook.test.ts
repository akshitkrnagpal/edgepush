/**
 * Outbound webhook HMAC tests.
 *
 * Locks in the current signature format (sha256=<base64>) used by
 * dispatchWebhook. If we ever upgrade the format to the design doc's
 * spec (t=<unix>,v1=<hex>), these tests will fail and remind us to
 * rewrite the signing code, the verification helper, and the docs at
 * the same time.
 *
 * We verify the signature by computing HMAC-SHA256 with Node's Web
 * Crypto and comparing base64-encoded against the header the dispatcher
 * produced. This is the same code a webhook consumer would write.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { dispatchWebhook, type WebhookPayload } from "./webhook";

const SECRET = "whsec_abcdef1234567890";

const basePayload: WebhookPayload = {
  event: "message.delivered",
  messageId: "msg_test_123",
  appId: "app_test_456",
  status: "delivered",
  timestamp: 1712000000000,
};

interface CapturedRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string;
}

function mockCapturingFetch(
  response: { status: number; ok: boolean } = { status: 200, ok: true },
): () => CapturedRequest {
  let captured: CapturedRequest | null = null;
  const mock = vi.fn((url: string, init: RequestInit) => {
    const headers: Record<string, string> = {};
    const rawHeaders = init.headers as Record<string, string> | undefined;
    if (rawHeaders) {
      for (const [k, v] of Object.entries(rawHeaders)) {
        headers[k.toLowerCase()] = v;
      }
    }
    captured = {
      url,
      method: init.method ?? "GET",
      headers,
      body: init.body as string,
    };
    return Promise.resolve({
      ok: response.ok,
      status: response.status,
    } as Response);
  });
  vi.stubGlobal("fetch", mock);
  return () => {
    if (!captured) throw new Error("fetch was not called");
    return captured;
  };
}

async function expectedSignature(body: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(body),
  );
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

describe("dispatchWebhook", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("POSTs to the configured URL with the JSON payload as the body", async () => {
    const getRequest = mockCapturingFetch();
    await dispatchWebhook("https://example.com/hook", SECRET, basePayload);

    const req = getRequest();
    expect(req.url).toBe("https://example.com/hook");
    expect(req.method).toBe("POST");
    expect(JSON.parse(req.body)).toEqual(basePayload);
  });

  it("sets content-type: application/json", async () => {
    const getRequest = mockCapturingFetch();
    await dispatchWebhook("https://example.com/hook", SECRET, basePayload);
    expect(getRequest().headers["content-type"]).toBe("application/json");
  });

  it("signs the body with HMAC-SHA256 and sends sha256=<base64>", async () => {
    const getRequest = mockCapturingFetch();
    await dispatchWebhook("https://example.com/hook", SECRET, basePayload);

    const req = getRequest();
    const header = req.headers["x-edgepush-signature"];
    expect(header).toMatch(/^sha256=/);

    const expected = await expectedSignature(req.body, SECRET);
    expect(header).toBe(`sha256=${expected}`);
  });

  it("fails verification when the body is tampered post-sign", async () => {
    const getRequest = mockCapturingFetch();
    await dispatchWebhook("https://example.com/hook", SECRET, basePayload);

    const req = getRequest();
    const header = req.headers["x-edgepush-signature"]!;
    const sig = header.replace("sha256=", "");

    // Verify against a DIFFERENT body, signature should not match.
    const tampered = JSON.stringify({ ...basePayload, status: "failed" });
    const expectedForTampered = await expectedSignature(tampered, SECRET);
    expect(expectedForTampered).not.toBe(sig);
  });

  it("fails verification when a different secret is used", async () => {
    const getRequest = mockCapturingFetch();
    await dispatchWebhook("https://example.com/hook", SECRET, basePayload);

    const req = getRequest();
    const header = req.headers["x-edgepush-signature"]!;
    const sig = header.replace("sha256=", "");

    const wrongSecret = await expectedSignature(req.body, "different-secret");
    expect(wrongSecret).not.toBe(sig);
  });

  it("sets x-edgepush-event to the payload event type", async () => {
    const getRequest = mockCapturingFetch();
    await dispatchWebhook("https://example.com/hook", SECRET, {
      ...basePayload,
      event: "message.failed",
    });
    expect(getRequest().headers["x-edgepush-event"]).toBe("message.failed");
  });

  it("sets a user-agent identifying edgepush", async () => {
    const getRequest = mockCapturingFetch();
    await dispatchWebhook("https://example.com/hook", SECRET, basePayload);
    expect(getRequest().headers["user-agent"]).toContain("edgepush");
  });

  it("returns ok=true on 2xx response", async () => {
    mockCapturingFetch({ status: 200, ok: true });
    const result = await dispatchWebhook(
      "https://example.com/hook",
      SECRET,
      basePayload,
    );
    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
  });

  it("returns ok=false on 4xx/5xx response", async () => {
    mockCapturingFetch({ status: 500, ok: false });
    const result = await dispatchWebhook(
      "https://example.com/hook",
      SECRET,
      basePayload,
    );
    expect(result.ok).toBe(false);
    expect(result.status).toBe(500);
  });
});
