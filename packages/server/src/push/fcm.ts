/**
 * FCM HTTP v1 dispatcher using raw fetch.
 *
 * Auth: service account JSON. We create an OAuth2 access token by signing
 * a JWT with the private key and exchanging it at
 * https://oauth2.googleapis.com/token.
 *
 * Access tokens are cached for 50 minutes.
 */

import { importPKCS8, SignJWT } from "jose";

import type { FcmCredentials, PushMessage } from "@edgepush/orpc";

interface ServiceAccount {
  client_email: string;
  private_key: string;
  project_id: string;
  token_uri?: string;
}

const accessTokenCache = new Map<
  string,
  { token: string; expiresAt: number }
>();

async function getAccessToken(creds: FcmCredentials): Promise<string> {
  const cached = accessTokenCache.get(creds.projectId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.token;
  }

  const sa = JSON.parse(creds.serviceAccountJson) as ServiceAccount;
  const tokenUri = sa.token_uri ?? "https://oauth2.googleapis.com/token";

  const privateKey = await importPKCS8(sa.private_key, "RS256");

  const jwt = await new SignJWT({
    scope: "https://www.googleapis.com/auth/firebase.messaging",
  })
    .setProtectedHeader({ alg: "RS256" })
    .setIssuer(sa.client_email)
    .setSubject(sa.client_email)
    .setAudience(tokenUri)
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(privateKey);

  const res = await fetch(tokenUri, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }).toString(),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`FCM token exchange failed: ${res.status} ${body}`);
  }

  const body = (await res.json()) as { access_token: string; expires_in: number };
  const token = body.access_token;
  accessTokenCache.set(creds.projectId, {
    token,
    expiresAt: Date.now() + (body.expires_in - 300) * 1000,
  });
  return token;
}

export interface FcmDispatchResult {
  ok: boolean;
  error?: string;
  tokenInvalid?: boolean;
  fcmMessageName?: string;
}

export async function dispatchFcm(
  creds: FcmCredentials,
  deviceToken: string | null,
  message: PushMessage,
): Promise<FcmDispatchResult> {
  const accessToken = await getAccessToken(creds);

  // FCM lets you put image at the top-level notification block (legacy)
  // or under android.notification.image (HTTP v1). We use the v1 location.
  const androidNotification: Record<string, unknown> = {
    sound: message.sound ?? "default",
    channel_id: message.category,
  };
  if (message.image) {
    androidNotification.image = message.image;
  }

  // expirationAt (absolute) wins over ttl (relative).
  let androidTtl: string | undefined;
  if (message.expirationAt !== undefined) {
    const seconds = Math.max(
      0,
      message.expirationAt - Math.floor(Date.now() / 1000),
    );
    androidTtl = `${seconds}s`;
  } else if (message.ttl !== undefined) {
    androidTtl = `${message.ttl}s`;
  }

  // FCM target: exactly one of token, topic, or condition.
  const target: Record<string, string> = {};
  if (message.topic) {
    target.topic = message.topic;
  } else if (message.condition) {
    target.condition = message.condition;
  } else if (deviceToken) {
    target.token = deviceToken;
  }

  const fcmMessage: Record<string, unknown> = {
    ...target,
    notification:
      message.title || message.body
        ? {
            title: message.title,
            body: message.body,
            // Top-level image is also honored by some clients; harmless dup.
            image: message.image,
          }
        : undefined,
    data: message.data
      ? Object.fromEntries(
          Object.entries(message.data).map(([k, v]) => [k, String(v)]),
        )
      : undefined,
    android: {
      priority: message.priority === "normal" ? "NORMAL" : "HIGH",
      ttl: androidTtl,
      collapse_key: message.collapseId,
      notification: androidNotification,
    },
  };

  // Strip undefined fields
  for (const k of ["notification", "data"] as const) {
    if (fcmMessage[k] === undefined) delete fcmMessage[k];
  }
  // Drop the top-level notification.image when no image is set so we don't
  // send `image: undefined` to FCM (some clients reject unknown nulls).
  if (
    fcmMessage.notification &&
    typeof fcmMessage.notification === "object" &&
    (fcmMessage.notification as Record<string, unknown>).image === undefined
  ) {
    delete (fcmMessage.notification as Record<string, unknown>).image;
  }

  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${creds.projectId}/messages:send`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ message: fcmMessage }),
    },
  );

  if (res.ok) {
    const body = (await res.json()) as { name?: string };
    return { ok: true, fcmMessageName: body.name };
  }

  const body = await res.text().catch(() => "");
  let errorCode = "";
  try {
    const json = JSON.parse(body) as {
      error?: { status?: string; message?: string };
    };
    errorCode = json.error?.status ?? "";
  } catch {
    // ignore
  }

  const tokenInvalid =
    errorCode === "NOT_FOUND" ||
    errorCode === "INVALID_ARGUMENT" ||
    errorCode === "UNREGISTERED";

  return {
    ok: false,
    error: `FCM ${res.status}: ${errorCode || body || "unknown"}`,
    tokenInvalid,
  };
}
