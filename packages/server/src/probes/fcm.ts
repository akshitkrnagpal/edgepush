/**
 * FCM credential health probe.
 *
 * Unlike APNs (one-step, sign JWT, POST to /3/device), FCM is two-step:
 *   1. Exchange the service account private key for an OAuth2 access
 *      token at https://oauth2.googleapis.com/token.
 *   2. POST a minimal message to /v1/projects/<projectId>/messages:send
 *      with a bogus device token. The server's response tells us whether
 *      the service account still has the cloudmessaging.messages:create
 *      permission on a live FCM project.
 *
 * Step 1 alone is not sufficient. Google will happily mint an access
 * token for a service account that has lost its FCM role or whose
 * project has been disabled. We need the real messages:send round trip
 * to catch those cases.
 *
 * ┌─────────────────────────────────┬──────────────────────────────────┐
 * │ failure mode                    │ probe result                     │
 * ├─────────────────────────────────┼──────────────────────────────────┤
 * │ OAuth2 exchange returns 4xx     │ broken, service account gone    │
 * │ OAuth2 exchange returns 5xx     │ transient                        │
 * │ messages:send INVALID_ARGUMENT  │ ok, auth passed, bogus token    │
 * │ messages:send UNREGISTERED      │ ok                               │
 * │ messages:send 401               │ broken, auth state rotten       │
 * │ messages:send 403 PERMISSION_*  │ broken, lost messaging role     │
 * │ messages:send 404 NOT_FOUND     │ broken, project disabled/gone   │
 * │ messages:send 429               │ transient                        │
 * │ messages:send 5xx               │ transient                        │
 * └─────────────────────────────────┴──────────────────────────────────┘
 */

import { importPKCS8, SignJWT } from "jose";

import type { ProbeResult } from "./types";

const BOGUS_DEVICE_TOKEN = "0".repeat(163); // FCM tokens are ~163 chars; exact
// length doesn't matter for the probe because FCM rejects the format before
// touching auth, but we avoid producing something that triggers a 400 on
// body parsing instead of on token validation.

interface ServiceAccount {
  client_email: string;
  private_key: string;
  project_id: string;
  token_uri?: string;
}

export interface FcmProbeInput {
  /** Decrypted service account JSON (verbatim from Google Cloud Console). */
  serviceAccountJson: string;
  /**
   * Project ID to probe. Read from the stored fcmCredentials.projectId
   * column, which is extracted at upload time.
   */
  projectId: string;
}

export async function probeFcmCredentials(
  input: FcmProbeInput,
): Promise<ProbeResult> {
  // Step 0: parse the service account JSON.
  let sa: ServiceAccount;
  try {
    sa = JSON.parse(input.serviceAccountJson) as ServiceAccount;
    if (!sa.client_email || !sa.private_key) {
      throw new Error("service account JSON missing client_email or private_key");
    }
  } catch (err) {
    return {
      state: "broken",
      error: `stored service account JSON is malformed: ${
        err instanceof Error ? err.message : "unknown"
      }`,
    };
  }

  const tokenUri = sa.token_uri ?? "https://oauth2.googleapis.com/token";

  // Step 1: exchange private key for an OAuth2 access token.
  let accessToken: string;
  try {
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

    const oauthRes = await fetch(tokenUri, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }).toString(),
    });

    if (!oauthRes.ok) {
      const body = await oauthRes.text().catch(() => "");
      // 4xx at the OAuth step almost always means the service account is
      // dead (deleted, key revoked, project disabled). That's "broken".
      // 5xx is transient.
      if (oauthRes.status >= 500) {
        return {
          state: "transient",
          error: `OAuth2 5xx: ${oauthRes.status}, will retry next cycle`,
        };
      }
      return {
        state: "broken",
        error: `OAuth2 token exchange rejected: ${oauthRes.status} ${body.slice(0, 400)}`,
      };
    }

    const parsed = (await oauthRes.json()) as { access_token?: string };
    if (!parsed.access_token) {
      return {
        state: "broken",
        error: "OAuth2 response missing access_token",
      };
    }
    accessToken = parsed.access_token;
  } catch (err) {
    return {
      state: "transient",
      error: `OAuth2 network/crypto error: ${
        err instanceof Error ? err.message : "unknown"
      }`,
    };
  }

  // Step 2: POST a bogus-token send to FCM. We're not trying to deliver
  // a notification, we want to learn whether the access token is usable
  // against this project's FCM API.
  const endpoint = `https://fcm.googleapis.com/v1/projects/${input.projectId}/messages:send`;
  let sendRes: Response;
  try {
    sendRes = await fetch(endpoint, {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        message: {
          token: BOGUS_DEVICE_TOKEN,
          notification: { title: "probe", body: "probe" },
        },
      }),
    });
  } catch (err) {
    return {
      state: "transient",
      error: `network error reaching FCM messages:send: ${
        err instanceof Error ? err.message : "unknown"
      }`,
    };
  }

  if (sendRes.ok) {
    // Shouldn't happen with a bogus token, but if FCM accepts it we treat
    // the credential as healthy.
    return { state: "ok", error: "" };
  }

  // Parse the structured error.
  let errorCode = "";
  let errorMessage = "";
  try {
    const body = await sendRes.text();
    try {
      const json = JSON.parse(body) as {
        error?: { status?: string; message?: string };
      };
      errorCode = json.error?.status ?? "";
      errorMessage = json.error?.message ?? body;
    } catch {
      errorMessage = body;
    }
  } catch {
    errorMessage = "";
  }

  // Bogus token was rejected as expected AND auth passed through. Healthy.
  if (errorCode === "INVALID_ARGUMENT" || errorCode === "UNREGISTERED") {
    return { state: "ok", error: "" };
  }

  // Auth state is rotten or permission is missing.
  if (sendRes.status === 401 || errorCode === "UNAUTHENTICATED") {
    return {
      state: "broken",
      error: `FCM rejected access token (401): ${errorMessage.slice(0, 400)}`,
    };
  }
  if (sendRes.status === 403 || errorCode === "PERMISSION_DENIED") {
    return {
      state: "broken",
      error: `FCM permission denied, service account probably lost cloudmessaging.messages:create: ${errorMessage.slice(0, 400)}`,
    };
  }
  if (sendRes.status === 404 || errorCode === "NOT_FOUND") {
    return {
      state: "broken",
      error: `FCM project not found, project "${input.projectId}" was deleted or FCM was disabled on it`,
    };
  }

  if (sendRes.status === 429) {
    return {
      state: "transient",
      error: "FCM rate limit (429), will retry next cycle",
    };
  }

  if (sendRes.status >= 500) {
    return {
      state: "transient",
      error: `FCM server error (${sendRes.status}), will retry next cycle`,
    };
  }

  return {
    state: "transient",
    error: `unknown FCM response ${sendRes.status} ${errorCode}: ${errorMessage.slice(0, 400)}`,
  };
}
