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

import type { FcmCredentials, PushMessage } from "@edgepush/shared";

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
  deviceToken: string,
  message: PushMessage,
): Promise<FcmDispatchResult> {
  const accessToken = await getAccessToken(creds);

  const fcmMessage: Record<string, unknown> = {
    token: deviceToken,
    notification:
      message.title || message.body
        ? {
            title: message.title,
            body: message.body,
          }
        : undefined,
    data: message.data
      ? Object.fromEntries(
          Object.entries(message.data).map(([k, v]) => [k, String(v)]),
        )
      : undefined,
    android: {
      priority: message.priority === "normal" ? "NORMAL" : "HIGH",
      ttl: message.ttl !== undefined ? `${message.ttl}s` : undefined,
      notification: {
        sound: message.sound ?? "default",
        channel_id: message.category,
      },
    },
  };

  // Strip undefined fields
  for (const k of ["notification", "data"] as const) {
    if (fcmMessage[k] === undefined) delete fcmMessage[k];
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
