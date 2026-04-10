/**
 * Helper to extract the current user from a Better Auth session cookie
 * on an incoming Hono request.
 */

import type { Context } from "hono";

import { createAuth } from "./better-auth";
import type { AppContext } from "../types";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
}

export async function getSessionUser(
  c: Context<AppContext>,
): Promise<SessionUser | null> {
  const auth = createAuth(c.env);
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session?.user) return null;

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
  };
}
