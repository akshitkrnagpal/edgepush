/**
 * Authenticate an incoming API request via the `Authorization: Bearer <apiKey>`
 * header or a session token + app ID. Returns the resolved app or null.
 */

import { eq, and, gt, isNull } from "drizzle-orm";

import { splitApiKey } from "@edgepush/orpc";
import type { Db } from "../db";
import { apiKeys, apps, session as sessionTable } from "../db/schema";
import { hashApiKey } from "./crypto";

export interface AuthedApp {
  appId: string;
  userId: string;
  packageName: string;
  apiKeyId: string;
  rateLimitPerMinute: number | null;
}

export async function authenticateApiKey(
  db: Db,
  authHeader: string | null,
): Promise<AuthedApp | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;

  const rawKey = authHeader.slice(7).trim();
  const parsed = splitApiKey(rawKey);
  if (!parsed) return null;

  const keyHash = await hashApiKey(rawKey);

  const row = await db
    .select({
      apiKeyId: apiKeys.id,
      appId: apps.id,
      userId: apps.userId,
      packageName: apps.packageName,
      rateLimitPerMinute: apps.rateLimitPerMinute,
      revokedAt: apiKeys.revokedAt,
    })
    .from(apiKeys)
    .innerJoin(apps, eq(apiKeys.appId, apps.id))
    .where(
      and(
        eq(apiKeys.keyHash, keyHash),
        eq(apps.packageName, parsed.packageName),
        isNull(apiKeys.revokedAt),
      ),
    )
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!row) return null;

  // Fire-and-forget lastUsedAt update (not awaited)
  await db
    .update(apiKeys)
    .set({ lastUsedAt: Date.now() })
    .where(eq(apiKeys.id, row.apiKeyId));

  return {
    apiKeyId: row.apiKeyId,
    appId: row.appId,
    userId: row.userId,
    packageName: row.packageName,
    rateLimitPerMinute: row.rateLimitPerMinute,
  };
}

/**
 * Authenticate via session token + explicit app ID (for CLI).
 * Verifies the session is valid and the user owns the app.
 */
export async function authenticateSessionApp(
  db: Db,
  token: string,
  appId: string,
): Promise<AuthedApp | null> {
  const sessionRow = await db
    .select({ userId: sessionTable.userId })
    .from(sessionTable)
    .where(
      and(
        eq(sessionTable.token, token),
        gt(sessionTable.expiresAt, new Date()),
      ),
    )
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!sessionRow) return null;

  const app = await db
    .select({
      id: apps.id,
      userId: apps.userId,
      packageName: apps.packageName,
      rateLimitPerMinute: apps.rateLimitPerMinute,
    })
    .from(apps)
    .where(and(eq(apps.id, appId), eq(apps.userId, sessionRow.userId)))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!app) return null;

  return {
    apiKeyId: "session",
    appId: app.id,
    userId: app.userId,
    packageName: app.packageName,
    rateLimitPerMinute: app.rateLimitPerMinute,
  };
}
