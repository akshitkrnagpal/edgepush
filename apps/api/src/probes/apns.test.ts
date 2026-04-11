/**
 * APNs probe unit tests.
 *
 * These tests mock `fetch` so we can assert our response-code
 * interpretation without hitting Apple's real endpoint. The point is
 * to lock in the critical truth table:
 *
 *   400 BadDeviceToken / 410 Unregistered    → ok
 *   403 InvalidProviderToken / Forbidden     → broken
 *   400 BadTopic / MissingTopic              → topic_mismatch
 *   429                                      → transient
 *   5xx                                      → transient
 *   unknown 4xx                              → transient (safer)
 *
 * If Apple ever changes what these codes mean we'll catch the drift
 * here before it ships.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { probeApnsCredentials } from "./apns";

// A valid ES256 P-256 private key in PKCS#8 PEM format. This is a
// real-format key (generated deterministically) so `importPKCS8` in
// jose accepts it. The corresponding public key is not trusted by
// anyone — it's only used locally by the probe to sign a JWT that
// the mocked fetch will never validate.
const TEST_P8_KEY = `-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgevZzL1gdAFr88hb2
OF/2NxApJCzGCEDdfSp6VQO30hyhRANCAAQRWz+jn65BtOMvdyHKcvjBeBSDZH2r
1RTwjmYSi9R/zpBnuQ4EiMnCqfMPWiZqB4QdbAd0E7oH50VpuZ1P087G
-----END PRIVATE KEY-----`;

const baseInput = {
  keyId: "ABC1234567",
  teamId: "DEF2345678",
  privateKey: TEST_P8_KEY,
  bundleId: "io.example.app",
  production: true,
};

function mockApnsFetch(
  status: number,
  body: unknown = {},
  overrides: Partial<Response> = {},
) {
  const response = {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
    headers: new Headers(),
    ...overrides,
  } as Response;
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
}

describe("probeApnsCredentials", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns ok when Apple rejects the bogus token with BadDeviceToken", async () => {
    mockApnsFetch(400, { reason: "BadDeviceToken" });
    const result = await probeApnsCredentials(baseInput);
    expect(result.state).toBe("ok");
    expect(result.error).toBe("");
  });

  it("returns ok when Apple rejects with Unregistered", async () => {
    mockApnsFetch(410, { reason: "Unregistered" });
    const result = await probeApnsCredentials(baseInput);
    expect(result.state).toBe("ok");
  });

  it("returns ok when Apple rejects with DeviceTokenNotForTopic", async () => {
    mockApnsFetch(400, { reason: "DeviceTokenNotForTopic" });
    const result = await probeApnsCredentials(baseInput);
    expect(result.state).toBe("ok");
  });

  it("returns broken on InvalidProviderToken (revoked key)", async () => {
    mockApnsFetch(403, { reason: "InvalidProviderToken" });
    const result = await probeApnsCredentials(baseInput);
    expect(result.state).toBe("broken");
    expect(result.error).toContain("InvalidProviderToken");
  });

  it("returns broken on ExpiredProviderToken", async () => {
    mockApnsFetch(403, { reason: "ExpiredProviderToken" });
    const result = await probeApnsCredentials(baseInput);
    expect(result.state).toBe("broken");
  });

  it("returns broken on Forbidden (team ID wrong)", async () => {
    mockApnsFetch(403, { reason: "Forbidden" });
    const result = await probeApnsCredentials(baseInput);
    expect(result.state).toBe("broken");
  });

  it("returns topic_mismatch on BadTopic (dashboard-only, no alert email)", async () => {
    mockApnsFetch(400, { reason: "BadTopic" });
    const result = await probeApnsCredentials(baseInput);
    expect(result.state).toBe("topic_mismatch");
    expect(result.error).toContain("io.example.app");
  });

  it("returns topic_mismatch on MissingTopic", async () => {
    mockApnsFetch(400, { reason: "MissingTopic" });
    const result = await probeApnsCredentials(baseInput);
    expect(result.state).toBe("topic_mismatch");
  });

  it("returns transient on 429 rate limit", async () => {
    mockApnsFetch(429, { reason: "TooManyRequests" });
    const result = await probeApnsCredentials(baseInput);
    expect(result.state).toBe("transient");
    expect(result.error).toContain("429");
  });

  it("returns transient on 5xx server error", async () => {
    mockApnsFetch(503, { reason: "InternalServerError" });
    const result = await probeApnsCredentials(baseInput);
    expect(result.state).toBe("transient");
    expect(result.error).toContain("503");
  });

  it("returns transient on unknown 4xx code (does not flip to broken)", async () => {
    mockApnsFetch(418, { reason: "WhatDoesThatEvenMean" });
    const result = await probeApnsCredentials(baseInput);
    // Safer to keep the last-known state than to mark broken on a
    // code we don't recognize.
    expect(result.state).toBe("transient");
  });

  it("returns broken on malformed .p8 key (jose throws)", async () => {
    // No fetch mock needed — jose throws before we hit the network.
    const result = await probeApnsCredentials({
      ...baseInput,
      privateKey: "not a valid pem key",
    });
    expect(result.state).toBe("broken");
    expect(result.error).toContain("malformed");
  });

  it("returns transient on network error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("connect ECONNREFUSED")),
    );
    const result = await probeApnsCredentials(baseInput);
    expect(result.state).toBe("transient");
    expect(result.error).toContain("network error");
  });

  it("hits the production endpoint when production:true", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: () => Promise.resolve(JSON.stringify({ reason: "BadDeviceToken" })),
      headers: new Headers(),
    });
    vi.stubGlobal("fetch", fetchMock);

    await probeApnsCredentials({ ...baseInput, production: true });
    expect(fetchMock).toHaveBeenCalledOnce();
    const url = (fetchMock.mock.calls[0] as [string, unknown])[0];
    expect(url).toContain("api.push.apple.com");
    expect(url).not.toContain("sandbox");
  });

  it("hits the sandbox endpoint when production:false", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: () => Promise.resolve(JSON.stringify({ reason: "BadDeviceToken" })),
      headers: new Headers(),
    });
    vi.stubGlobal("fetch", fetchMock);

    await probeApnsCredentials({ ...baseInput, production: false });
    const url = (fetchMock.mock.calls[0] as [string, unknown])[0];
    expect(url).toContain("sandbox.push.apple.com");
  });

  it("sends apns-topic header with the provided bundleId", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: () => Promise.resolve(JSON.stringify({ reason: "BadDeviceToken" })),
      headers: new Headers(),
    });
    vi.stubGlobal("fetch", fetchMock);

    await probeApnsCredentials({ ...baseInput, bundleId: "io.custom.topic" });
    const init = (fetchMock.mock.calls[0] as [string, RequestInit])[1];
    const headers = init?.headers as Record<string, string>;
    expect(headers["apns-topic"]).toBe("io.custom.topic");
  });
});
