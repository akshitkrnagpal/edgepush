/**
 * APNs credential health probe.
 *
 * Runs on a cron (see cron.ts). For each set of APNs credentials that is
 * due for a check, sign a JWT with the stored .p8 private key and POST it
 * to api.push.apple.com with a known-bogus device token. Apple's response
 * tells us whether the auth key is still valid:
 *
 * ┌────────────────────────────────────┬───────────────────────────────┐
 * │ APNs response                      │ probe result                  │
 * ├────────────────────────────────────┼───────────────────────────────┤
 * │ 400 BadDeviceToken                 │ ok. JWT + topic are valid    │
 * │ 410 Unregistered                   │ ok                            │
 * │ 403 InvalidProviderToken           │ broken, key revoked          │
 * │ 403 ExpiredProviderToken           │ broken, key expired          │
 * │ 403 Forbidden                      │ broken, team ID wrong        │
 * │ 400 BadTopic / MissingTopic        │ topic_mismatch                │
 * │ 429                                │ transient, back off          │
 * │ 5xx / network error                │ transient                     │
 * │ anything else                      │ transient, safer not to     │
 * │                                    │ flip state on unknown codes   │
 * └────────────────────────────────────┴───────────────────────────────┘
 *
 * We use a 64-character all-zeros hex string as the bogus device token.
 * Apple returns BadDeviceToken for it without touching the key validity
 * check, which is the signal we want.
 *
 * The probe does NOT cache JWTs, the cron runs at most once per hour and
 * the cache would invalidate between invocations anyway. Each probe signs
 * a fresh JWT.
 */

import { importPKCS8, SignJWT } from "jose";

const APNS_PROD = "https://api.push.apple.com/3/device/";
const APNS_SANDBOX = "https://api.sandbox.push.apple.com/3/device/";
const BOGUS_DEVICE_TOKEN = "0".repeat(64);

import type { ProbeResult } from "./types";

export interface ApnsProbeInput {
  keyId: string;
  teamId: string;
  /** Decrypted .p8 private key (PEM string). */
  privateKey: string;
  /** Bundle ID, read from apps.packageName at load time. */
  bundleId: string;
  /** Whether to probe the production or sandbox endpoint. */
  production: boolean;
}

export async function probeApnsCredentials(
  input: ApnsProbeInput,
): Promise<ProbeResult> {
  let jwt: string;
  try {
    const privateKey = await importPKCS8(input.privateKey, "ES256");
    jwt = await new SignJWT({})
      .setProtectedHeader({ alg: "ES256", kid: input.keyId })
      .setIssuer(input.teamId)
      .setIssuedAt()
      .sign(privateKey);
  } catch (err) {
    // A malformed .p8 key means the stored credential is unusable -
    // flag as broken with a clear message so the user knows to re-upload.
    return {
      state: "broken",
      error: `could not sign JWT, stored .p8 key is malformed (${
        err instanceof Error ? err.message : "unknown error"
      })`,
    };
  }

  const endpoint = input.production ? APNS_PROD : APNS_SANDBOX;
  const url = `${endpoint}${BOGUS_DEVICE_TOKEN}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        authorization: `bearer ${jwt}`,
        "apns-topic": input.bundleId,
        "apns-push-type": "alert",
        "apns-priority": "10",
      },
      body: JSON.stringify({ aps: { alert: "probe" } }),
    });
  } catch (err) {
    return {
      state: "transient",
      error: `network error reaching APNs: ${
        err instanceof Error ? err.message : "unknown"
      }`,
    };
  }

  // Success would be weird (we sent a bogus device token), but if Apple
  // accepts it we treat it as a healthy credential.
  if (res.ok) {
    return { state: "ok", error: "" };
  }

  let reason = "";
  try {
    const bodyText = await res.text();
    try {
      const json = JSON.parse(bodyText) as { reason?: string };
      reason = json.reason ?? bodyText;
    } catch {
      reason = bodyText;
    }
  } catch {
    reason = "";
  }

  // Token-is-bad codes: our bogus token is rejected as expected AND the
  // JWT + topic are valid. Credential is healthy.
  if (
    reason === "BadDeviceToken" ||
    reason === "Unregistered" ||
    reason === "DeviceTokenNotForTopic"
  ) {
    return { state: "ok", error: "" };
  }

  // Auth-is-bad codes: the stored key is no longer accepted.
  if (
    reason === "InvalidProviderToken" ||
    reason === "ExpiredProviderToken" ||
    reason === "Forbidden" ||
    reason === "MissingProviderToken"
  ) {
    return {
      state: "broken",
      error: `APNs rejected the signing key: ${reason}`,
    };
  }

  // Topic-is-wrong codes: JWT is valid but the bundleId we pass doesn't
  // match what Apple expects. This is a config issue, not a credential
  // problem. We surface it in the dashboard but don't email the user.
  if (reason === "BadTopic" || reason === "MissingTopic") {
    return {
      state: "topic_mismatch",
      error: `APNs rejected the topic "${input.bundleId}" (${reason}), the app's package_name probably doesn't match the real iOS bundle ID`,
    };
  }

  // Rate limit: back off, try again next cycle.
  if (res.status === 429) {
    return {
      state: "transient",
      error: "APNs rate limit (429), will retry next cycle",
    };
  }

  // Server error: back off. Not the user's problem.
  if (res.status >= 500) {
    return {
      state: "transient",
      error: `APNs server error (${res.status}), will retry next cycle`,
    };
  }

  // Unknown 4xx, treat as transient rather than flipping to broken on
  // a code we don't recognize. Log it for operator review.
  return {
    state: "transient",
    error: `unknown APNs response ${res.status}: ${reason || "no reason"}`,
  };
}
