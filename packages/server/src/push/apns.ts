/**
 * APNs HTTP/2 dispatcher using raw fetch.
 *
 * APNs token-based auth uses a short-lived JWT signed with the .p8 private
 * key. We sign with the jose library (works on Workers) and POST to
 * api.push.apple.com or api.sandbox.push.apple.com.
 *
 * Cloudflare Workers fetch supports HTTP/2 transparently.
 */

import { importPKCS8, SignJWT } from "jose";

import type { ApnsCredentials } from "@edgepush/orpc";
import type { PushMessage } from "@edgepush/orpc";

const APNS_PROD = "https://api.push.apple.com/3/device/";
const APNS_SANDBOX = "https://api.sandbox.push.apple.com/3/device/";

const tokenCache = new Map<
  string,
  { jwt: string; expiresAt: number }
>();

/**
 * Create a short-lived APNs JWT. JWTs are reused for up to 55 minutes
 * (Apple allows up to 60; we subtract 5 for safety).
 */
async function getApnsJwt(creds: ApnsCredentials): Promise<string> {
  const cacheKey = `${creds.teamId}:${creds.keyId}`;
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.jwt;
  }

  const privateKey = await importPKCS8(creds.privateKey, "ES256");
  const jwt = await new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: creds.keyId })
    .setIssuer(creds.teamId)
    .setIssuedAt()
    .sign(privateKey);

  tokenCache.set(cacheKey, {
    jwt,
    expiresAt: Date.now() + 55 * 60 * 1000,
  });
  return jwt;
}

export interface ApnsDispatchResult {
  ok: boolean;
  error?: string;
  tokenInvalid?: boolean;
  /** APNs returns this on success, helpful for tracing. */
  apnsId?: string;
}

export async function dispatchApns(
  creds: ApnsCredentials,
  deviceToken: string,
  message: PushMessage,
): Promise<ApnsDispatchResult> {
  const jwt = await getApnsJwt(creds);
  const endpoint = creds.production ? APNS_PROD : APNS_SANDBOX;

  const payload: Record<string, unknown> = {
    aps: {
      alert: message.title || message.body
        ? {
            title: message.title,
            body: message.body,
          }
        : undefined,
      sound: message.sound ?? "default",
      badge: message.badge,
      category: message.category,
      "interruption-level": message.timeSensitive
        ? "time-sensitive"
        : undefined,
      "content-available": message.contentAvailable ? 1 : undefined,
      "mutable-content": message.mutableContent ? 1 : undefined,
    },
  };

  // Strip undefined aps fields
  for (const k of Object.keys(payload.aps as object)) {
    if ((payload.aps as Record<string, unknown>)[k] === undefined) {
      delete (payload.aps as Record<string, unknown>)[k];
    }
  }

  // Image URL goes in the custom data block where the Notification Service
  // Extension reads it from. Standard convention name is "image".
  if (message.image) {
    payload.image = message.image;
  }

  // Merge custom data (after image so user data wins on key collision).
  if (message.data) {
    for (const [k, v] of Object.entries(message.data)) {
      if (k !== "aps") payload[k] = v;
    }
  }

  // Default push type follows the legacy "background if content-available,
  // otherwise alert" rule. Caller can override for voip / location / etc.
  const defaultPushType = message.contentAvailable ? "background" : "alert";
  const headers: Record<string, string> = {
    authorization: `bearer ${jwt}`,
    "apns-topic": creds.bundleId,
    "apns-push-type": message.pushType ?? defaultPushType,
    "apns-priority": message.priority === "normal" ? "5" : "10",
  };

  if (message.collapseId) {
    headers["apns-collapse-id"] = message.collapseId;
  }

  // expirationAt (absolute) wins over ttl (relative). Either one drops the
  // notification once the deadline passes. Omit both to let APNs decide.
  if (message.expirationAt !== undefined) {
    headers["apns-expiration"] = String(message.expirationAt);
  } else if (message.ttl !== undefined) {
    headers["apns-expiration"] = String(
      Math.floor(Date.now() / 1000) + message.ttl,
    );
  }

  const res = await fetch(`${endpoint}${deviceToken}`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (res.ok) {
    return {
      ok: true,
      apnsId: res.headers.get("apns-id") ?? undefined,
    };
  }

  const bodyText = await res.text().catch(() => "");
  let reason = "";
  try {
    const json = JSON.parse(bodyText) as { reason?: string };
    reason = json.reason ?? "";
  } catch {
    reason = bodyText;
  }

  // Token-invalidation codes per Apple docs
  const tokenInvalid =
    reason === "BadDeviceToken" ||
    reason === "Unregistered" ||
    reason === "DeviceTokenNotForTopic";

  return {
    ok: false,
    error: `APNs ${res.status}: ${reason || bodyText || "unknown"}`,
    tokenInvalid,
  };
}
