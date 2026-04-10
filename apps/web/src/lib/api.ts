/**
 * Thin wrapper around the edgepush dashboard API (Cloudflare Worker).
 *
 * All requests are made with `credentials: include` so the Better Auth
 * session cookie is sent along.
 */

const baseURL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${baseURL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "content-type": "application/json",
      ...init.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(body || `${res.status} ${res.statusText}`);
  }

  return (await res.json()) as T;
}

export const api = {
  listApps: () =>
    request<{ data: Array<{ id: string; name: string; packageName: string; createdAt: number }> }>(
      "/api/dashboard/apps",
    ),
  createApp: (body: { name: string; packageName: string }) =>
    request<{ id: string }>("/api/dashboard/apps", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  deleteApp: (id: string) =>
    request<{ ok: boolean }>(`/api/dashboard/apps/${id}`, {
      method: "DELETE",
    }),
  listApiKeys: (appId: string) =>
    request<{
      data: Array<{
        id: string;
        label: string;
        preview: string;
        createdAt: number;
        lastUsedAt: number | null;
        revokedAt: number | null;
      }>;
    }>(`/api/dashboard/apps/${appId}/api-keys`),
  createApiKey: (appId: string, label: string) =>
    request<{ id: string; apiKey: string; preview: string; label: string }>(
      `/api/dashboard/apps/${appId}/api-keys`,
      {
        method: "POST",
        body: JSON.stringify({ label }),
      },
    ),
  revokeApiKey: (appId: string, keyId: string) =>
    request<{ ok: boolean }>(
      `/api/dashboard/apps/${appId}/api-keys/${keyId}/revoke`,
      { method: "POST" },
    ),
  getCredentials: (appId: string) =>
    request<{
      apns: {
        keyId: string;
        teamId: string;
        bundleId: string;
        production: boolean;
        updatedAt: number;
      } | null;
      fcm: {
        projectId: string;
        updatedAt: number;
      } | null;
    }>(`/api/dashboard/apps/${appId}/credentials`),
  uploadApns: (
    appId: string,
    body: {
      keyId: string;
      teamId: string;
      bundleId: string;
      privateKey: string;
      production: boolean;
    },
  ) =>
    request<{ ok: boolean }>(
      `/api/dashboard/apps/${appId}/credentials/apns`,
      { method: "PUT", body: JSON.stringify(body) },
    ),
  uploadFcm: (
    appId: string,
    body: { projectId: string; serviceAccountJson: string },
  ) =>
    request<{ ok: boolean }>(
      `/api/dashboard/apps/${appId}/credentials/fcm`,
      { method: "PUT", body: JSON.stringify(body) },
    ),
  listMessages: (appId: string) =>
    request<{
      data: Array<{
        id: string;
        to: string;
        platform: "ios" | "android";
        title: string | null;
        body: string | null;
        status: string;
        error: string | null;
        tokenInvalid: boolean;
        createdAt: number;
        updatedAt: number;
      }>;
    }>(`/api/dashboard/apps/${appId}/messages`),
  getWebhook: (appId: string) =>
    request<{
      url: string;
      enabled: boolean;
      updatedAt: number;
    } | null>(`/api/dashboard/apps/${appId}/webhook`),
  upsertWebhook: (
    appId: string,
    body: { url: string; enabled?: boolean },
  ) =>
    request<{ ok: boolean; secret?: string }>(
      `/api/dashboard/apps/${appId}/webhook`,
      { method: "PUT", body: JSON.stringify(body) },
    ),
  deleteWebhook: (appId: string) =>
    request<{ ok: boolean }>(`/api/dashboard/apps/${appId}/webhook`, {
      method: "DELETE",
    }),
  sendTestPush: (
    appId: string,
    body: {
      to: string;
      platform?: "ios" | "android";
      title?: string;
      body?: string;
    },
  ) =>
    request<{ id: string }>(`/api/dashboard/apps/${appId}/test-push`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  listAuditLog: (appId: string) =>
    request<{
      data: Array<{
        id: string;
        action: string;
        metadata: Record<string, unknown> | null;
        createdAt: number;
      }>;
    }>(`/api/dashboard/apps/${appId}/audit`),
};
