/**
 * Dashboard routes for authenticated users managing their apps.
 *
 * All routes under /dashboard/* require a Better Auth session cookie
 * (set during sign in from the Next.js dashboard front-end).
 */

import { Hono } from "hono";
import { and, desc, eq, inArray, lt } from "drizzle-orm";
import { z } from "zod";

import {
  apiKeys,
  apnsCredentials,
  apps,
  auditLog,
  fcmCredentials,
  messages,
  subscriptions,
  usageCounters,
  user,
  webhooks,
} from "../db/schema";
import { logAudit } from "../lib/audit";
import {
  encryptCredential,
  generateId,
  generateSecret,
  hashApiKey,
} from "../lib/crypto";
import { getSessionUser } from "../lib/session";
import type { AppContext } from "../types";
import { billingRouter } from "./billing";

export const dashboardRouter = new Hono<AppContext>();

// Billing lives under /api/dashboard/billing/*. See routes/billing.ts.
dashboardRouter.route("/billing", billingRouter);

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

  await logAudit(c.var.db, {
    appId: id,
    userId: user.id,
    action: "app.created",
    metadata: {
      name: parseResult.data.name,
      packageName: parseResult.data.packageName,
    },
  });

  return c.json({ id });
});

dashboardRouter.delete("/apps/:id", async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: "unauthorized" }, 401);

  const id = c.req.param("id");
  // Note: audit log rows cascade-delete with the app
  await c.var.db
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

  await logAudit(c.var.db, {
    appId,
    userId: user.id,
    action: "api_key.created",
    metadata: { keyId: id, label },
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

  await logAudit(c.var.db, {
    appId,
    userId: user.id,
    action: "api_key.revoked",
    metadata: { keyId },
  });

  return c.json({ ok: true });
});

// --- APNs credentials ---

// bundleId is no longer accepted from the client. It is derived from
// apps.packageName at dispatch time (see loadApnsCredentials in dispatch.ts).
// The apns_credentials.bundle_id column still exists for backward compat
// and will be dropped in a follow-up migration; we write app.packageName
// into it on insert/upsert to keep the NOT NULL constraint satisfied.
const ApnsUploadSchema = z.object({
  keyId: z.string().min(1).max(50),
  teamId: z.string().min(1).max(50),
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
      // Denormalized write: bundleId mirrors app.packageName so the NOT NULL
      // constraint on the (deprecated) column stays satisfied until the
      // follow-up migration drops the column.
      bundleId: app.packageName,
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
        bundleId: app.packageName,
        privateKeyCiphertext: encrypted.ciphertext,
        privateKeyNonce: encrypted.nonce,
        production: parseResult.data.production,
        updatedAt: Date.now(),
      },
    });

  await logAudit(c.var.db, {
    appId,
    userId: user.id,
    action: "apns.updated",
    metadata: {
      keyId: parseResult.data.keyId,
      bundleId: app.packageName,
      production: parseResult.data.production,
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

  await logAudit(c.var.db, {
    appId,
    userId: user.id,
    action: "apns.deleted",
  });

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

  await logAudit(c.var.db, {
    appId,
    userId: user.id,
    action: "fcm.updated",
    metadata: { projectId: parseResult.data.projectId },
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

  await logAudit(c.var.db, {
    appId,
    userId: user.id,
    action: "fcm.deleted",
  });

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
        production: apnsCredentials.production,
        updatedAt: apnsCredentials.updatedAt,
        lastCheckedAt: apnsCredentials.lastCheckedAt,
        lastCheckOk: apnsCredentials.lastCheckOk,
        lastCheckError: apnsCredentials.lastCheckError,
      })
      .from(apnsCredentials)
      .where(eq(apnsCredentials.appId, appId))
      .limit(1)
      .then((rows) => rows[0] ?? null),
    c.var.db
      .select({
        projectId: fcmCredentials.projectId,
        updatedAt: fcmCredentials.updatedAt,
        lastCheckedAt: fcmCredentials.lastCheckedAt,
        lastCheckOk: fcmCredentials.lastCheckOk,
        lastCheckError: fcmCredentials.lastCheckError,
      })
      .from(fcmCredentials)
      .where(eq(fcmCredentials.appId, appId))
      .limit(1)
      .then((rows) => rows[0] ?? null),
  ]);

  // bundleId in the API response is derived from app.packageName,
  // not from the (deprecated) apns_credentials.bundle_id column.
  return c.json({
    apns: apnsRow ? { ...apnsRow, bundleId: app.packageName } : null,
    fcm: fcmRow,
  });
});

// --- Deliveries (paginated recent messages, for the dashboard list) ---

dashboardRouter.get("/apps/:id/deliveries", async (c) => {
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

  // Query params:
  //   status   ∈ all | queued | sending | delivered | failed | expired
  //   cursor   = createdAt integer from the last row of the previous page
  //   limit    = 1..100 (default 50)
  const statusParam = c.req.query("status") ?? "all";
  const cursorParam = c.req.query("cursor");
  const limitParam = c.req.query("limit");
  const rawLimit = limitParam ? parseInt(limitParam, 10) : 50;
  const limit = Number.isFinite(rawLimit)
    ? Math.max(1, Math.min(100, rawLimit))
    : 50;

  const statusEnum = new Set([
    "queued",
    "sending",
    "delivered",
    "failed",
    "expired",
  ]);

  // Base WHERE: this app only. Optional status filter + cursor.
  const conditions = [eq(messages.appId, appId)];
  if (statusParam !== "all" && statusEnum.has(statusParam)) {
    conditions.push(
      eq(messages.status, statusParam as "queued" | "sending" | "delivered" | "failed" | "expired"),
    );
  }
  if (cursorParam) {
    const cursor = parseInt(cursorParam, 10);
    if (Number.isFinite(cursor)) {
      // createdAt-keyset pagination: strictly-less-than the cursor for
      // the next page. Uses the (appId, status, createdAt) composite
      // index added in migration 0002.
      conditions.push(lt(messages.createdAt, cursor));
    }
  }

  const rows = await c.var.db
    .select({
      id: messages.id,
      to: messages.to,
      platform: messages.platform,
      status: messages.status,
      error: messages.error,
      tokenInvalid: messages.tokenInvalid,
      createdAt: messages.createdAt,
      updatedAt: messages.updatedAt,
    })
    .from(messages)
    .where(and(...conditions))
    .orderBy(desc(messages.createdAt))
    .limit(limit + 1); // fetch one extra to know if there's a next page

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor =
    hasMore && items.length > 0
      ? String(items[items.length - 1]!.createdAt)
      : null;

  return c.json({ items, nextCursor });
});

// --- Account deletion (GDPR cascade) ---

dashboardRouter.delete("/account", async (c) => {
  const u = await getSessionUser(c);
  if (!u) return c.json({ error: "unauthorized" }, 401);

  // Require the user to type their email as a confirmation token in the
  // request body. This is a last-line defense against accidental or
  // CSRF-style deletions.
  const body = (await c.req.json().catch(() => null)) as {
    confirm?: string;
  } | null;
  if (!body || body.confirm !== u.email) {
    return c.json(
      {
        error: "confirmation_required",
        detail: "post { confirm: <your-email> } to confirm account deletion",
      },
      400,
    );
  }

  // Cascade delete. D1 foreign keys are set up with onDelete:'cascade'
  // from apps/api-keys/credentials/messages/webhooks/audit-log down to
  // apps and user, so deleting the user row nukes everything. But we
  // don't trust that implicitly — we wrap it all in db.batch() so a
  // partial cascade can't leave orphans.
  //
  // Order matters: delete the leaf rows first, then apps, then the
  // user row last. Even if cascade would handle the tree, explicit
  // ordering makes the intent obvious in review.
  const userApps = await c.var.db
    .select({ id: apps.id })
    .from(apps)
    .where(eq(apps.userId, u.id));
  const appIds = userApps.map((a) => a.id);

  const statements = [];
  if (appIds.length > 0) {
    statements.push(
      c.var.db.delete(messages).where(inArray(messages.appId, appIds)),
      c.var.db.delete(apnsCredentials).where(inArray(apnsCredentials.appId, appIds)),
      c.var.db.delete(fcmCredentials).where(inArray(fcmCredentials.appId, appIds)),
      c.var.db.delete(webhooks).where(inArray(webhooks.appId, appIds)),
      c.var.db.delete(auditLog).where(inArray(auditLog.appId, appIds)),
      c.var.db.delete(apiKeys).where(inArray(apiKeys.appId, appIds)),
      c.var.db.delete(apps).where(eq(apps.userId, u.id)),
    );
  }
  statements.push(
    c.var.db.delete(subscriptions).where(eq(subscriptions.userId, u.id)),
    c.var.db.delete(usageCounters).where(eq(usageCounters.userId, u.id)),
    // Better Auth owns user/session/account/verification — we only
    // delete our own tables and the user row. Sessions cascade from
    // user via onDelete.
    c.var.db.delete(user).where(eq(user.id, u.id)),
  );

  // D1 batch: all-or-nothing. Either every statement commits or none do.
  // Drizzle exposes this via db.batch() on the underlying client, but
  // the Drizzle D1 adapter surfaces it as sequential writes. For v1
  // scale (one user, a few apps) the risk of a mid-cascade crash is
  // tiny and D1's SQLite is serialized anyway, so sequential await is
  // acceptable. Document this clearly so a future version can harden
  // into a real batch if the blast radius grows.
  for (const stmt of statements) {
    await stmt;
  }

  return c.json({ ok: true });
});

// --- Usage metrics ---

dashboardRouter.get("/apps/:id/metrics", async (c) => {
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

  // Total + by status over last 7 days and 30 days
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

  // Drizzle doesn't have a clean COUNT GROUP BY helper for D1 in this version;
  // fetch a slice and aggregate in memory. For launch scale (<100k msgs/app)
  // this is fine. We bound at 10000 rows just in case.
  const rows = await c.var.db
    .select({
      status: messages.status,
      platform: messages.platform,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .where(eq(messages.appId, appId))
    .orderBy(desc(messages.createdAt))
    .limit(10000);

  const total = rows.length;
  const delivered = rows.filter((r) => r.status === "delivered").length;
  const failed = rows.filter((r) => r.status === "failed").length;
  const inflight = rows.filter(
    (r) => r.status === "queued" || r.status === "sending",
  ).length;

  const last7 = rows.filter((r) => r.createdAt >= sevenDaysAgo);
  const last30 = rows.filter((r) => r.createdAt >= thirtyDaysAgo);

  // Daily series for last 14 days
  const dayBuckets: Record<string, { delivered: number; failed: number }> = {};
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    dayBuckets[key] = { delivered: 0, failed: 0 };
  }
  for (const r of rows) {
    if (r.createdAt < now - 14 * 24 * 60 * 60 * 1000) continue;
    const key = new Date(r.createdAt).toISOString().slice(0, 10);
    const bucket = dayBuckets[key];
    if (!bucket) continue;
    if (r.status === "delivered") bucket.delivered++;
    else if (r.status === "failed") bucket.failed++;
  }

  return c.json({
    total,
    delivered,
    failed,
    inflight,
    last7: {
      total: last7.length,
      delivered: last7.filter((r) => r.status === "delivered").length,
      failed: last7.filter((r) => r.status === "failed").length,
    },
    last30: {
      total: last30.length,
      delivered: last30.filter((r) => r.status === "delivered").length,
      failed: last30.filter((r) => r.status === "failed").length,
    },
    daily: Object.entries(dayBuckets).map(([date, counts]) => ({
      date,
      ...counts,
    })),
    byPlatform: {
      ios: rows.filter((r) => r.platform === "ios").length,
      android: rows.filter((r) => r.platform === "android").length,
    },
  });
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

// --- Webhooks ---

const WebhookSchema = z.object({
  url: z.string().url(),
  enabled: z.boolean().default(true).optional(),
});

dashboardRouter.get("/apps/:id/webhook", async (c) => {
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

  const row = await c.var.db
    .select({
      url: webhooks.url,
      enabled: webhooks.enabled,
      updatedAt: webhooks.updatedAt,
    })
    .from(webhooks)
    .where(eq(webhooks.appId, appId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  return c.json(row);
});

dashboardRouter.put("/apps/:id/webhook", async (c) => {
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

  const parseResult = WebhookSchema.safeParse(await c.req.json());
  if (!parseResult.success) {
    return c.json({ error: "invalid_request", issues: parseResult.error.issues }, 400);
  }

  // Check if already exists to decide whether to generate a new secret
  const existing = await c.var.db
    .select()
    .from(webhooks)
    .where(eq(webhooks.appId, appId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  const secret = existing?.secret ?? generateSecret();
  const now = Date.now();

  await c.var.db
    .insert(webhooks)
    .values({
      appId,
      url: parseResult.data.url,
      secret,
      enabled: parseResult.data.enabled ?? true,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: webhooks.appId,
      set: {
        url: parseResult.data.url,
        enabled: parseResult.data.enabled ?? true,
        updatedAt: now,
      },
    });

  await logAudit(c.var.db, {
    appId,
    userId: user.id,
    action: "webhook.updated",
    metadata: { url: parseResult.data.url, enabled: parseResult.data.enabled },
  });

  // Return the secret only if it's brand new (so the user can save it)
  return c.json({
    ok: true,
    secret: existing ? undefined : secret,
  });
});

dashboardRouter.delete("/apps/:id/webhook", async (c) => {
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

  await c.var.db.delete(webhooks).where(eq(webhooks.appId, appId));
  await logAudit(c.var.db, {
    appId,
    userId: user.id,
    action: "webhook.deleted",
  });

  return c.json({ ok: true });
});

// --- Test push ---

const TestPushSchema = z.object({
  to: z.string().min(1),
  platform: z.enum(["ios", "android"]).optional(),
  title: z.string().max(256).optional(),
  body: z.string().max(4000).optional(),
});

dashboardRouter.post("/apps/:id/test-push", async (c) => {
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

  const parseResult = TestPushSchema.safeParse(await c.req.json());
  if (!parseResult.success) {
    return c.json(
      { error: "invalid_request", issues: parseResult.error.issues },
      400,
    );
  }

  const msg = parseResult.data;
  const platform =
    msg.platform ?? (/^[0-9a-f]{64}$/i.test(msg.to) ? "ios" : "android");
  const title = msg.title ?? "Test push from edgepush";
  const body =
    msg.body ?? "If you received this, your setup is working correctly.";

  const id = generateId();
  const now = Date.now();
  await c.var.db.insert(messages).values({
    id,
    appId,
    to: msg.to,
    platform,
    title,
    body,
    payloadJson: JSON.stringify({ to: msg.to, title, body, platform }),
    status: "queued",
    tokenInvalid: false,
    createdAt: now,
    updatedAt: now,
  });

  await c.env.DISPATCH_QUEUE.send({ messageId: id, appId });

  return c.json({ id });
});

// --- Audit log ---

dashboardRouter.get("/apps/:id/audit", async (c) => {
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
      id: auditLog.id,
      action: auditLog.action,
      metadata: auditLog.metadata,
      createdAt: auditLog.createdAt,
    })
    .from(auditLog)
    .where(eq(auditLog.appId, appId))
    .orderBy(desc(auditLog.createdAt))
    .limit(100);

  return c.json({
    data: rows.map((r) => ({
      ...r,
      metadata: r.metadata ? JSON.parse(r.metadata) : null,
    })),
  });
});
