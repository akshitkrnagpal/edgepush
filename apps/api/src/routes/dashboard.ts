/**
 * Dashboard routes for authenticated users managing their apps.
 *
 * All routes under /dashboard/* require a Better Auth session cookie
 * (set during sign in from the Next.js dashboard front-end).
 */

import { Hono } from "hono";
import { and, eq, desc } from "drizzle-orm";
import { z } from "zod";

import {
  apiKeys,
  apnsCredentials,
  apps,
  fcmCredentials,
  messages,
} from "../db/schema";
import {
  encryptCredential,
  generateId,
  generateSecret,
  hashApiKey,
} from "../lib/crypto";
import { getSessionUser } from "../lib/session";
import type { AppContext } from "../types";

export const dashboardRouter = new Hono<AppContext>();

// --- Apps ---

dashboardRouter.get("/apps", async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: "unauthorized" }, 401);

  const rows = await c.var.db
    .select({
      id: apps.id,
      name: apps.name,
      packageName: apps.packageName,
      createdAt: apps.createdAt,
    })
    .from(apps)
    .where(eq(apps.userId, user.id))
    .orderBy(desc(apps.createdAt));

  return c.json({ data: rows });
});

const CreateAppSchema = z.object({
  name: z.string().min(1).max(100),
  packageName: z
    .string()
    .min(3)
    .max(200)
    .regex(/^[a-z0-9][a-z0-9._-]*$/i, {
      message:
        "packageName must start with a letter or digit and contain only letters, digits, dots, dashes, underscores",
    }),
});

dashboardRouter.post("/apps", async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: "unauthorized" }, 401);

  const parseResult = CreateAppSchema.safeParse(await c.req.json());
  if (!parseResult.success) {
    return c.json({ error: "invalid_request", issues: parseResult.error.issues }, 400);
  }

  const id = generateId();
  await c.var.db.insert(apps).values({
    id,
    userId: user.id,
    name: parseResult.data.name,
    packageName: parseResult.data.packageName,
    createdAt: Date.now(),
  });

  return c.json({ id });
});

dashboardRouter.delete("/apps/:id", async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: "unauthorized" }, 401);

  const id = c.req.param("id");
  const result = await c.var.db
    .delete(apps)
    .where(and(eq(apps.id, id), eq(apps.userId, user.id)));

  return c.json({ ok: true });
});

// --- API keys ---

dashboardRouter.get("/apps/:id/api-keys", async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: "unauthorized" }, 401);

  const appId = c.req.param("id");
  const app = await c.var.db
    .select()
    .from(apps)
    .where(and(eq(apps.id, appId), eq(apps.userId, user.id)))
    .limit(1)
    .then((rows) => rows[0] ?? null);
  if (!app) return c.json({ error: "not_found" }, 404);

  const rows = await c.var.db
    .select({
      id: apiKeys.id,
      label: apiKeys.label,
      preview: apiKeys.preview,
      createdAt: apiKeys.createdAt,
      lastUsedAt: apiKeys.lastUsedAt,
      revokedAt: apiKeys.revokedAt,
    })
    .from(apiKeys)
    .where(eq(apiKeys.appId, appId))
    .orderBy(desc(apiKeys.createdAt));

  return c.json({ data: rows });
});

dashboardRouter.post("/apps/:id/api-keys", async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: "unauthorized" }, 401);

  const appId = c.req.param("id");
  const app = await c.var.db
    .select()
    .from(apps)
    .where(and(eq(apps.id, appId), eq(apps.userId, user.id)))
    .limit(1)
    .then((rows) => rows[0] ?? null);
  if (!app) return c.json({ error: "not_found" }, 404);

  const body = (await c.req.json()) as { label?: unknown };
  const label =
    typeof body.label === "string" && body.label.trim().length > 0
      ? body.label.trim().slice(0, 100)
      : "default";

  const secret = generateSecret();
  const rawKey = `${app.packageName}|${secret}`;
  const keyHash = await hashApiKey(rawKey);
  const preview = secret.slice(0, 8);

  const id = generateId();
  await c.var.db.insert(apiKeys).values({
    id,
    appId,
    keyHash,
    preview,
    label,
    createdAt: Date.now(),
  });

  // The raw key is shown ONCE, right after creation. It's not stored.
  return c.json({ id, apiKey: rawKey, preview, label });
});

dashboardRouter.post("/apps/:id/api-keys/:keyId/revoke", async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: "unauthorized" }, 401);

  const appId = c.req.param("id");
  const keyId = c.req.param("keyId");

  // Ensure ownership
  const app = await c.var.db
    .select()
    .from(apps)
    .where(and(eq(apps.id, appId), eq(apps.userId, user.id)))
    .limit(1)
    .then((rows) => rows[0] ?? null);
  if (!app) return c.json({ error: "not_found" }, 404);

  await c.var.db
    .update(apiKeys)
    .set({ revokedAt: Date.now() })
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.appId, appId)));

  return c.json({ ok: true });
});

// --- APNs credentials ---

const ApnsUploadSchema = z.object({
  keyId: z.string().min(1).max(50),
  teamId: z.string().min(1).max(50),
  bundleId: z.string().min(1).max(200),
  privateKey: z.string().min(1),
  production: z.boolean().default(true),
});

dashboardRouter.put("/apps/:id/credentials/apns", async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: "unauthorized" }, 401);

  const appId = c.req.param("id");
  const app = await c.var.db
    .select()
    .from(apps)
    .where(and(eq(apps.id, appId), eq(apps.userId, user.id)))
    .limit(1)
    .then((rows) => rows[0] ?? null);
  if (!app) return c.json({ error: "not_found" }, 404);

  const parseResult = ApnsUploadSchema.safeParse(await c.req.json());
  if (!parseResult.success) {
    return c.json({ error: "invalid_request", issues: parseResult.error.issues }, 400);
  }

  const encrypted = await encryptCredential(
    parseResult.data.privateKey,
    c.env.ENCRYPTION_KEY,
  );

  await c.var.db
    .insert(apnsCredentials)
    .values({
      appId,
      keyId: parseResult.data.keyId,
      teamId: parseResult.data.teamId,
      bundleId: parseResult.data.bundleId,
      privateKeyCiphertext: encrypted.ciphertext,
      privateKeyNonce: encrypted.nonce,
      production: parseResult.data.production,
      updatedAt: Date.now(),
    })
    .onConflictDoUpdate({
      target: apnsCredentials.appId,
      set: {
        keyId: parseResult.data.keyId,
        teamId: parseResult.data.teamId,
        bundleId: parseResult.data.bundleId,
        privateKeyCiphertext: encrypted.ciphertext,
        privateKeyNonce: encrypted.nonce,
        production: parseResult.data.production,
        updatedAt: Date.now(),
      },
    });

  return c.json({ ok: true });
});

dashboardRouter.delete("/apps/:id/credentials/apns", async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: "unauthorized" }, 401);

  const appId = c.req.param("id");
  const app = await c.var.db
    .select()
    .from(apps)
    .where(and(eq(apps.id, appId), eq(apps.userId, user.id)))
    .limit(1)
    .then((rows) => rows[0] ?? null);
  if (!app) return c.json({ error: "not_found" }, 404);

  await c.var.db.delete(apnsCredentials).where(eq(apnsCredentials.appId, appId));
  return c.json({ ok: true });
});

// --- FCM credentials ---

const FcmUploadSchema = z.object({
  projectId: z.string().min(1).max(200),
  serviceAccountJson: z.string().min(1),
});

dashboardRouter.put("/apps/:id/credentials/fcm", async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: "unauthorized" }, 401);

  const appId = c.req.param("id");
  const app = await c.var.db
    .select()
    .from(apps)
    .where(and(eq(apps.id, appId), eq(apps.userId, user.id)))
    .limit(1)
    .then((rows) => rows[0] ?? null);
  if (!app) return c.json({ error: "not_found" }, 404);

  const parseResult = FcmUploadSchema.safeParse(await c.req.json());
  if (!parseResult.success) {
    return c.json({ error: "invalid_request", issues: parseResult.error.issues }, 400);
  }

  // Validate JSON parses
  try {
    JSON.parse(parseResult.data.serviceAccountJson);
  } catch {
    return c.json({ error: "invalid_service_account_json" }, 400);
  }

  const encrypted = await encryptCredential(
    parseResult.data.serviceAccountJson,
    c.env.ENCRYPTION_KEY,
  );

  await c.var.db
    .insert(fcmCredentials)
    .values({
      appId,
      projectId: parseResult.data.projectId,
      serviceAccountCiphertext: encrypted.ciphertext,
      serviceAccountNonce: encrypted.nonce,
      updatedAt: Date.now(),
    })
    .onConflictDoUpdate({
      target: fcmCredentials.appId,
      set: {
        projectId: parseResult.data.projectId,
        serviceAccountCiphertext: encrypted.ciphertext,
        serviceAccountNonce: encrypted.nonce,
        updatedAt: Date.now(),
      },
    });

  return c.json({ ok: true });
});

dashboardRouter.delete("/apps/:id/credentials/fcm", async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: "unauthorized" }, 401);

  const appId = c.req.param("id");
  const app = await c.var.db
    .select()
    .from(apps)
    .where(and(eq(apps.id, appId), eq(apps.userId, user.id)))
    .limit(1)
    .then((rows) => rows[0] ?? null);
  if (!app) return c.json({ error: "not_found" }, 404);

  await c.var.db.delete(fcmCredentials).where(eq(fcmCredentials.appId, appId));
  return c.json({ ok: true });
});

// --- Credential status (without revealing secrets) ---

dashboardRouter.get("/apps/:id/credentials", async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: "unauthorized" }, 401);

  const appId = c.req.param("id");
  const app = await c.var.db
    .select()
    .from(apps)
    .where(and(eq(apps.id, appId), eq(apps.userId, user.id)))
    .limit(1)
    .then((rows) => rows[0] ?? null);
  if (!app) return c.json({ error: "not_found" }, 404);

  const [apnsRow, fcmRow] = await Promise.all([
    c.var.db
      .select({
        keyId: apnsCredentials.keyId,
        teamId: apnsCredentials.teamId,
        bundleId: apnsCredentials.bundleId,
        production: apnsCredentials.production,
        updatedAt: apnsCredentials.updatedAt,
      })
      .from(apnsCredentials)
      .where(eq(apnsCredentials.appId, appId))
      .limit(1)
      .then((rows) => rows[0] ?? null),
    c.var.db
      .select({
        projectId: fcmCredentials.projectId,
        updatedAt: fcmCredentials.updatedAt,
      })
      .from(fcmCredentials)
      .where(eq(fcmCredentials.appId, appId))
      .limit(1)
      .then((rows) => rows[0] ?? null),
  ]);

  return c.json({ apns: apnsRow, fcm: fcmRow });
});

// --- Messages history ---

dashboardRouter.get("/apps/:id/messages", async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: "unauthorized" }, 401);

  const appId = c.req.param("id");
  const app = await c.var.db
    .select()
    .from(apps)
    .where(and(eq(apps.id, appId), eq(apps.userId, user.id)))
    .limit(1)
    .then((rows) => rows[0] ?? null);
  if (!app) return c.json({ error: "not_found" }, 404);

  const rows = await c.var.db
    .select({
      id: messages.id,
      to: messages.to,
      platform: messages.platform,
      title: messages.title,
      body: messages.body,
      status: messages.status,
      error: messages.error,
      tokenInvalid: messages.tokenInvalid,
      createdAt: messages.createdAt,
      updatedAt: messages.updatedAt,
    })
    .from(messages)
    .where(eq(messages.appId, appId))
    .orderBy(desc(messages.createdAt))
    .limit(100);

  return c.json({ data: rows });
});
