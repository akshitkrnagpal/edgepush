/**
 * Authenticate an incoming API request via the `Authorization: Bearer <apiKey>`
 * header. Returns the resolved app or throws a 401.
 */

import { eq, and, isNull } from "drizzle-orm";

import { splitApiKey } from "@edgepush/shared";
import type { Db } from "../db";
import { apiKeys, apps } from "../db/schema";
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
