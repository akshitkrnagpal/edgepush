/**
 * oRPC router definition for edgepush.
 *
 * This is the single source of truth for every API procedure.
 * Both apps/app (Next.js route handler) and apps/api (Hono adapter)
 * import this router and mount it on their respective frameworks.
 *
 * The router defines the CONTRACT (input/output schemas) but not the
 * implementation. Implementations are injected via context when
 * mounting the router in each app.
 */

import { os } from "@orpc/server";
import { z } from "zod";

import {
  PushMessageSchema,
  SendRequestSchema,
} from "./schemas";

// --- Context type ---
// Each app (Next.js, Hono) provides this context when handling requests.
// The router procedures access D1, KV, etc. through this context.

export interface RouterContext {
  db: any; // Drizzle D1 instance
  env: Record<string, any>; // Worker env bindings
  userId?: string; // Set by session auth (dashboard routes)
  appId?: string; // Set by API key auth (public routes)
  authedApp?: {
    apiKeyId: string;
    appId: string;
    userId: string;
    packageName: string;
    rateLimitPerMinute: number | null;
  };
}

// --- Public procedures (Bearer API key auth) ---

const pub = os.$context<RouterContext>();

export const sendInput = SendRequestSchema;

export const sendOutput = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      status: z.enum(["ok", "error"]),
      message: z.string().optional(),
    }),
  ),
});

export const receiptOutput = z.object({
  id: z.string(),
  status: z.enum(["queued", "sending", "delivered", "failed", "expired"]),
  error: z.string().optional(),
  tokenInvalid: z.boolean().optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

// --- Dashboard procedures (session auth) ---

export const createAppInput = z.object({
  name: z.string().min(1).max(100),
  packageName: z.string().min(1).max(256),
});

export const updateRateLimitInput = z.object({
  appId: z.string(),
  rateLimitPerMinute: z.number().int().min(10).max(100000).nullable(),
});

export const createApiKeyInput = z.object({
  appId: z.string(),
  label: z.string().max(100).optional(),
});

export const revokeApiKeyInput = z.object({
  appId: z.string(),
  keyId: z.string(),
});

export const uploadApnsInput = z.object({
  appId: z.string(),
  keyId: z.string().min(1),
  teamId: z.string().min(1),
  privateKey: z.string().min(1),
  production: z.boolean().default(true),
});

export const uploadFcmInput = z.object({
  appId: z.string(),
  serviceAccountJson: z.string().min(1),
});

export const updateWebhookInput = z.object({
  appId: z.string(),
  url: z.string().url(),
  secret: z.string().min(16),
  enabled: z.boolean().default(true),
});

export const testPushInput = z.object({
  appId: z.string(),
  to: z.string().min(1),
  platform: z.enum(["ios", "android"]).optional(),
  title: z.string().max(256).optional(),
  body: z.string().max(4000).optional(),
});

export const deleteAccountInput = z.object({
  confirm: z.string().email(),
});

// --- Router shape ---
// This defines the procedure names and their input/output contracts.
// The actual implementations are provided when creating the router
// instance in each app.

export const routerContract = {
  // Public (API key auth)
  send: { input: sendInput, output: sendOutput },
  getReceipt: { input: z.object({ id: z.string() }), output: receiptOutput },
  getReceipts: {
    input: z.object({ ids: z.array(z.string()).max(500) }),
    output: z.object({ data: z.array(receiptOutput) }),
  },

  // Dashboard (session auth)
  listApps: { input: z.void(), output: z.any() },
  createApp: { input: createAppInput, output: z.object({ id: z.string() }) },
  deleteApp: { input: z.object({ id: z.string() }), output: z.object({ ok: z.boolean() }) },
  listApiKeys: { input: z.object({ appId: z.string() }), output: z.any() },
  createApiKey: { input: createApiKeyInput, output: z.any() },
  revokeApiKey: { input: revokeApiKeyInput, output: z.object({ ok: z.boolean() }) },
  uploadApns: { input: uploadApnsInput, output: z.object({ ok: z.boolean() }) },
  deleteApns: { input: z.object({ appId: z.string() }), output: z.object({ ok: z.boolean() }) },
  uploadFcm: { input: uploadFcmInput, output: z.object({ ok: z.boolean() }) },
  deleteFcm: { input: z.object({ appId: z.string() }), output: z.object({ ok: z.boolean() }) },
  getCredentials: { input: z.object({ appId: z.string() }), output: z.any() },
  getMetrics: { input: z.object({ appId: z.string() }), output: z.any() },
  getMessages: { input: z.object({ appId: z.string(), cursor: z.string().optional(), status: z.string().optional() }), output: z.any() },
  getWebhook: { input: z.object({ appId: z.string() }), output: z.any() },
  updateWebhook: { input: updateWebhookInput, output: z.object({ ok: z.boolean() }) },
  deleteWebhook: { input: z.object({ appId: z.string() }), output: z.object({ ok: z.boolean() }) },
  testPush: { input: testPushInput, output: z.any() },
  getAuditLog: { input: z.object({ appId: z.string() }), output: z.any() },
  updateRateLimit: { input: updateRateLimitInput, output: z.object({ ok: z.boolean(), rateLimitPerMinute: z.number().nullable() }) },

  // Billing
  getSubscription: { input: z.void(), output: z.any() },
  createCheckout: { input: z.void(), output: z.object({ url: z.string() }) },
  createBillingPortal: { input: z.void(), output: z.object({ url: z.string() }) },

  // Account
  deleteAccount: { input: deleteAccountInput, output: z.object({ ok: z.boolean() }) },
} as const;
