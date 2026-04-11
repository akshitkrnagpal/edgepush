/**
 * Stripe helper unit tests.
 *
 * Covers the cryptographic code in lib/stripe.ts — the parts most
 * likely to silently break a billing flow if they regress:
 *
 *   - signClientReferenceId + verifyClientReferenceId roundtrip
 *   - verifyClientReferenceId rejects forged signatures
 *   - verifyWebhookSignature accepts a correctly-signed payload
 *   - verifyWebhookSignature rejects stale timestamps (replay)
 *   - verifyWebhookSignature rejects tampered bodies
 *   - verifyWebhookSignature rejects missing/malformed headers
 *
 * These run under plain Node — crypto.subtle is a global on Node 20+.
 */

import { describe, expect, it } from "vitest";

import {
  signClientReferenceId,
  verifyClientReferenceId,
  verifyWebhookSignature,
} from "./stripe";

const HMAC_KEY = "test-stripe-ref-hmac-key";
const env = { STRIPE_REF_HMAC_KEY: HMAC_KEY };

describe("signClientReferenceId / verifyClientReferenceId", () => {
  it("roundtrips a userId through sign + verify", async () => {
    const signed = await signClientReferenceId(env, "user_123");
    const parsed = await verifyClientReferenceId(env, signed);
    expect(parsed).toBe("user_123");
  });

  it("returns a string with the userId visible as the first segment", async () => {
    const signed = await signClientReferenceId(env, "user_abc");
    expect(signed.startsWith("user_abc.")).toBe(true);
  });

  it("produces a reference that fits under Stripe's 200-char limit", async () => {
    const signed = await signClientReferenceId(env, "user_" + "x".repeat(50));
    expect(signed.length).toBeLessThanOrEqual(200);
  });

  it("rejects a forged signature (wrong HMAC)", async () => {
    // Craft a reference with a plausible but wrong signature.
    const forged = "user_123.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
    const parsed = await verifyClientReferenceId(env, forged);
    expect(parsed).toBeNull();
  });

  it("rejects a reference signed with a different key", async () => {
    const signed = await signClientReferenceId(
      { STRIPE_REF_HMAC_KEY: "different-key" },
      "user_123",
    );
    const parsed = await verifyClientReferenceId(env, signed);
    expect(parsed).toBeNull();
  });

  it("rejects null / empty / malformed input", async () => {
    expect(await verifyClientReferenceId(env, null)).toBeNull();
    expect(await verifyClientReferenceId(env, "")).toBeNull();
    expect(await verifyClientReferenceId(env, "no-dot")).toBeNull();
    expect(await verifyClientReferenceId(env, ".")).toBeNull();
    expect(await verifyClientReferenceId(env, "user.")).toBeNull();
    expect(await verifyClientReferenceId(env, ".sig")).toBeNull();
  });

  it("throws when signing without a configured HMAC key", async () => {
    await expect(
      signClientReferenceId({ STRIPE_REF_HMAC_KEY: undefined }, "user_123"),
    ).rejects.toThrow("STRIPE_REF_HMAC_KEY");
  });

  it("returns null when verifying without a configured HMAC key", async () => {
    const signed = await signClientReferenceId(env, "user_123");
    const parsed = await verifyClientReferenceId(
      { STRIPE_REF_HMAC_KEY: undefined },
      signed,
    );
    expect(parsed).toBeNull();
  });
});

describe("verifyWebhookSignature", () => {
  const secret = "whsec_test_secret";

  /**
   * Manually compute the expected Stripe-Signature header for a given
   * timestamp + body. Mirrors what Stripe's server would send.
   */
  async function signStripeWebhook(
    ts: number,
    body: string,
    key: string = secret,
  ): Promise<string> {
    const encoder = new TextEncoder();
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      encoder.encode(key),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const sig = await crypto.subtle.sign(
      "HMAC",
      cryptoKey,
      encoder.encode(`${ts}.${body}`),
    );
    const hex = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return `t=${ts},v1=${hex}`;
  }

  it("accepts a correctly-signed payload within the tolerance window", async () => {
    const body = '{"id":"evt_test","type":"checkout.session.completed"}';
    const ts = Math.floor(Date.now() / 1000);
    const header = await signStripeWebhook(ts, body);
    const result = await verifyWebhookSignature(secret, header, body);
    expect(result).toBe(true);
  });

  it("rejects a payload with a tampered body", async () => {
    const body = '{"id":"evt_test","type":"checkout.session.completed"}';
    const ts = Math.floor(Date.now() / 1000);
    const header = await signStripeWebhook(ts, body);
    // Verify against a different body — signature should fail.
    const tampered = '{"id":"evt_attacker","type":"checkout.session.completed"}';
    const result = await verifyWebhookSignature(secret, header, tampered);
    expect(result).toBe(false);
  });

  it("rejects a stale timestamp (replay attack)", async () => {
    const body = '{"id":"evt_test"}';
    const oldTs = Math.floor(Date.now() / 1000) - 10 * 60; // 10 min ago
    const header = await signStripeWebhook(oldTs, body);
    const result = await verifyWebhookSignature(secret, header, body);
    expect(result).toBe(false);
  });

  it("rejects a future timestamp outside the tolerance window", async () => {
    const body = '{"id":"evt_test"}';
    const futureTs = Math.floor(Date.now() / 1000) + 10 * 60;
    const header = await signStripeWebhook(futureTs, body);
    const result = await verifyWebhookSignature(secret, header, body);
    expect(result).toBe(false);
  });

  it("rejects null or empty header", async () => {
    const body = '{"id":"evt_test"}';
    expect(await verifyWebhookSignature(secret, null, body)).toBe(false);
    expect(await verifyWebhookSignature(secret, "", body)).toBe(false);
  });

  it("rejects header missing timestamp", async () => {
    const body = '{"id":"evt_test"}';
    expect(
      await verifyWebhookSignature(secret, "v1=deadbeef", body),
    ).toBe(false);
  });

  it("rejects header missing v1 signature", async () => {
    const body = '{"id":"evt_test"}';
    const ts = Math.floor(Date.now() / 1000);
    expect(await verifyWebhookSignature(secret, `t=${ts}`, body)).toBe(false);
  });

  it("rejects a payload signed with the wrong secret", async () => {
    const body = '{"id":"evt_test"}';
    const ts = Math.floor(Date.now() / 1000);
    const header = await signStripeWebhook(ts, body, "wrong_secret");
    const result = await verifyWebhookSignature(secret, header, body);
    expect(result).toBe(false);
  });

  it("accepts when multiple v1 signatures are present and one matches", async () => {
    // Stripe rotates webhook secrets with overlapping v1 values during
    // rollover. We must accept the valid one even when there are bogus
    // neighbors in the header.
    const body = '{"id":"evt_test"}';
    const ts = Math.floor(Date.now() / 1000);
    const valid = await signStripeWebhook(ts, body);
    const stuffed = valid.replace(
      /v1=([a-f0-9]+)/,
      "v1=deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef,v1=$1",
    );
    const result = await verifyWebhookSignature(secret, stuffed, body);
    expect(result).toBe(true);
  });
});
