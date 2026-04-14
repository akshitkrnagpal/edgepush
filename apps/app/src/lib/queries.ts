/**
 * Centralized React Query hooks and key factory for the dashboard.
 *
 * Every page imports from here so query invalidation works consistently
 * (mutations call queryClient.invalidateQueries with the matching key).
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { api } from "./api";

export const queryKeys = {
  apps: () => ["apps"] as const,
  app: (id: string) => ["apps", id] as const,
  apiKeys: (appId: string) => ["apps", appId, "api-keys"] as const,
  credentials: (appId: string) => ["apps", appId, "credentials"] as const,
  metrics: (appId: string) => ["apps", appId, "metrics"] as const,
  messages: (appId: string) => ["apps", appId, "messages"] as const,
  webhook: (appId: string) => ["apps", appId, "webhook"] as const,
  audit: (appId: string) => ["apps", appId, "audit"] as const,
  deliveries: (appId: string, status: string) =>
    ["apps", appId, "deliveries", status] as const,
  subscription: () => ["billing", "subscription"] as const,
};

// --- Apps ---

export function useApps() {
  return useQuery({
    queryKey: queryKeys.apps(),
    queryFn: () => api.listApps().then((r) => r.data),
  });
}

export function useCreateApp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; packageName: string }) =>
      api.createApp(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.apps() });
    },
  });
}

export function useDeleteApp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteApp(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.apps() });
    },
  });
}

// --- API keys ---

export function useApiKeys(appId: string) {
  return useQuery({
    queryKey: queryKeys.apiKeys(appId),
    queryFn: () => api.listApiKeys(appId).then((r) => r.data),
  });
}

export function useCreateApiKey(appId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (label: string) => api.createApiKey(appId, label),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.apiKeys(appId) });
    },
  });
}

export function useRevokeApiKey(appId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (keyId: string) => api.revokeApiKey(appId, keyId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.apiKeys(appId) });
    },
  });
}

// --- Credentials ---

export function useCredentials(appId: string) {
  return useQuery({
    queryKey: queryKeys.credentials(appId),
    queryFn: () => api.getCredentials(appId),
  });
}

export function useUploadApns(appId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      keyId: string;
      teamId: string;
      privateKey: string;
      production: boolean;
    }) => api.uploadApns(appId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.credentials(appId) });
    },
  });
}

export function useUploadFcm(appId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { projectId: string; serviceAccountJson: string }) =>
      api.uploadFcm(appId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.credentials(appId) });
    },
  });
}

// --- Metrics + messages ---

export function useMetrics(appId: string) {
  return useQuery({
    queryKey: queryKeys.metrics(appId),
    queryFn: () => api.getMetrics(appId),
  });
}

export function useMessages(appId: string) {
  return useQuery({
    queryKey: queryKeys.messages(appId),
    queryFn: () => api.listMessages(appId).then((r) => r.data),
  });
}

export function useSendTestPush(appId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      to: string;
      platform?: "ios" | "android";
      title?: string;
      body?: string;
    }) => api.sendTestPush(appId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.messages(appId) });
      qc.invalidateQueries({ queryKey: queryKeys.metrics(appId) });
    },
  });
}

// --- Webhook ---

export function useWebhook(appId: string) {
  return useQuery({
    queryKey: queryKeys.webhook(appId),
    queryFn: () => api.getWebhook(appId),
  });
}

export function useUpsertWebhook(appId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { url: string; enabled?: boolean }) =>
      api.upsertWebhook(appId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.webhook(appId) });
    },
  });
}

export function useDeleteWebhook(appId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.deleteWebhook(appId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.webhook(appId) });
    },
  });
}

// --- Audit log ---

export function useAuditLog(appId: string) {
  return useQuery({
    queryKey: queryKeys.audit(appId),
    queryFn: () => api.listAuditLog(appId).then((r) => r.data),
  });
}

// --- Deliveries (paginated, filterable) ---

export function useDeliveries(appId: string, status: string) {
  return useQuery({
    queryKey: queryKeys.deliveries(appId, status),
    queryFn: () => api.getDeliveries(appId, { status, limit: 50 }),
  });
}

// --- Billing ---

export function useSubscription() {
  return useQuery({
    queryKey: queryKeys.subscription(),
    queryFn: () => api.getSubscription(),
  });
}

export function useCreateCheckout() {
  return useMutation({
    mutationFn: () => api.createCheckout(),
  });
}

// --- Account ---

export function useDeleteAccount() {
  return useMutation({
    mutationFn: (confirmEmail: string) => api.deleteAccount(confirmEmail),
  });
}
