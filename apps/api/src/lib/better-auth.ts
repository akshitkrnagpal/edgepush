/**
 * Better Auth configuration for the edgepush Worker.
 *
 * Uses the drizzle adapter pointing at the D1 database via our Drizzle
 * schema. We create the auth instance per-request because the database
 * binding is only available once we have the request env.
 */

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { createDb } from "../db";
import type { Env } from "../types";
import * as schema from "../db/schema";

export function createAuth(env: Env) {
  const db = createDb(env.DB);
  const dashboardUrl = env.DASHBOARD_URL ?? env.BETTER_AUTH_URL;

  // If both API and dashboard share an eTLD+1, scope cookies to the
  // shared parent so the dashboard can include them in cross-subdomain
  // fetches with credentials.
  const cookieDomain = getSharedDomain(env.BETTER_AUTH_URL, dashboardUrl);

  return betterAuth({
    appName: "edgepush",
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
      },
    }),
    advanced: cookieDomain
      ? {
          crossSubDomainCookies: {
            enabled: true,
            domain: cookieDomain,
          },
          defaultCookieAttributes: {
            sameSite: "lax",
            secure: true,
          },
        }
      : undefined,
    socialProviders: {
      github:
        env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET
          ? {
              clientId: env.GITHUB_CLIENT_ID,
              clientSecret: env.GITHUB_CLIENT_SECRET,
            }
          : undefined,
    },
    trustedOrigins: [env.BETTER_AUTH_URL, dashboardUrl].filter(
      (x): x is string => Boolean(x),
    ),
  });
}

export type Auth = ReturnType<typeof createAuth>;

/**
 * If both URLs share an eTLD+1 like edgepush.dev, return ".edgepush.dev"
 * so cookies are scoped to the parent and shared across subdomains.
 * Returns null if the URLs don't share a parent or one is missing.
 */
function getSharedDomain(a?: string, b?: string): string | null {
  if (!a || !b) return null;
  try {
    const ha = new URL(a).hostname;
    const hb = new URL(b).hostname;
    if (ha === hb) return null;
    // Strip leading subdomain
    const parts = (host: string) => host.split(".");
    const pa = parts(ha);
    const pb = parts(hb);
    // Get the last 2 labels of each (eTLD+1 approximation, fine for .dev / .com)
    const eTLDa = pa.slice(-2).join(".");
    const eTLDb = pb.slice(-2).join(".");
    if (eTLDa !== eTLDb) return null;
    return `.${eTLDa}`;
  } catch {
    return null;
  }
}
