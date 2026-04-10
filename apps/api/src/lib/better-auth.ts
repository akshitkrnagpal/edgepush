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
    emailAndPassword: {
      enabled: true,
    },
    socialProviders: {
      google:
        env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
          ? {
              clientId: env.GOOGLE_CLIENT_ID,
              clientSecret: env.GOOGLE_CLIENT_SECRET,
            }
          : undefined,
      github:
        env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET
          ? {
              clientId: env.GITHUB_CLIENT_ID,
              clientSecret: env.GITHUB_CLIENT_SECRET,
            }
          : undefined,
    },
    trustedOrigins: [env.BETTER_AUTH_URL],
  });
}

export type Auth = ReturnType<typeof createAuth>;
