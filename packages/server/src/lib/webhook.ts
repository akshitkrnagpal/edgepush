/**
 * Webhook dispatcher. Posts receipt updates to the app's configured
 * webhook URL with an HMAC-SHA256 signature in the X-Edgepush-Signature
 * header.
 *
 * Callers verify the signature by computing
 *   HMAC_SHA256(webhookSecret, requestBody)
 * and comparing base64-encoded against the header value.
 */

async function sign(body: string, secret: string): Promise<string> {
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

export interface WebhookPayload {
  event: "message.delivered" | "message.failed" | "message.expired";
  messageId: string;
  appId: string;
  status: string;
  error?: string | null;
  tokenInvalid?: boolean;
  timestamp: number;
}

export async function dispatchWebhook(
  url: string,
  secret: string,
  payload: WebhookPayload,
): Promise<{ ok: boolean; status: number }> {
  const body = JSON.stringify(payload);
  const signature = await sign(body, secret);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "user-agent": "edgepush-webhook/1.0",
      "x-edgepush-signature": `sha256=${signature}`,
      "x-edgepush-event": payload.event,
    },
    body,
  });

  return { ok: res.ok, status: res.status };
}
