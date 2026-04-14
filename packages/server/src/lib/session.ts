/**
 * Helper to extract the current user from a Better Auth session cookie,
 * a Bearer session token (CLI), or a Bearer API key on an incoming
 * Hono request.
 *
 * Priority:
 * 1. Session cookie (dashboard browser requests)
 * 2. Bearer session token (CLI admin commands via `edgepush login`)
 * 3. Bearer API key (CLI send commands / programmatic access)
 */

import { and, eq, gt } from "drizzle-orm";
import type { Context } from "hono";

import { createAuth } from "./better-auth";
import { authenticateApiKey } from "./auth";
import { session as sessionTable, user } from "../db/schema";
import type { AppContext } from "../types";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
}

export async function getSessionUser(
  c: Context<AppContext>,
): Promise<SessionUser | null> {
  // 1. Try session cookie (dashboard browser requests)
  const auth = createAuth(c.env);
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (session?.user) {
    return {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
    };
  }

  // 2. Fall back to Bearer token (CLI)
  const authHeader = c.req.header("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);

    // 2a. Try session token lookup (from CLI OAuth login)
    const sessionRow = await c.var.db
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

    if (sessionRow) {
      const userRow = await c.var.db
        .select({ id: user.id, email: user.email, name: user.name })
        .from(user)
        .where(eq(user.id, sessionRow.userId))
        .limit(1)
        .then((rows) => rows[0] ?? null);

      if (userRow) {
        return {
          id: userRow.id,
          email: userRow.email,
          name: userRow.name ?? "",
        };
      }
    }

    // 2b. Try API key lookup
    const authedApp = await authenticateApiKey(c.var.db, authHeader);
    if (authedApp) {
      const userRow = await c.var.db
        .select({ id: user.id, email: user.email, name: user.name })
        .from(user)
        .where(eq(user.id, authedApp.userId))
        .limit(1)
        .then((rows) => rows[0] ?? null);

      if (userRow) {
        return {
          id: userRow.id,
          email: userRow.email,
          name: userRow.name ?? "",
        };
      }
    }
  }

  return null;
}
