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
import { sendEmail } from "./email";

export function createAuth(env: Env) {
  const db = createDb(env.DB);
  const dashboardUrl = env.DASHBOARD_URL ?? env.BETTER_AUTH_URL;

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
      requireEmailVerification: false,
      sendResetPassword: async ({ user, url }) => {
        await sendEmail(env, {
          to: user.email,
          subject: "Reset your edgepush password",
          text: `Hi ${user.name ?? ""},\n\nClick the link below to reset your edgepush password:\n\n${url}\n\nThis link expires in 1 hour. If you didn't request it, you can safely ignore this email.\n\n- edgepush`,
        });
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      sendVerificationEmail: async ({ user, url }) => {
        await sendEmail(env, {
          to: user.email,
          subject: "Verify your edgepush email",
          text: `Hi ${user.name ?? ""},\n\nClick the link below to verify your email and start using edgepush:\n\n${url}\n\n- edgepush`,
        });
      },
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
    trustedOrigins: [env.BETTER_AUTH_URL, dashboardUrl].filter(
      (x): x is string => Boolean(x),
    ),
  });
}

export type Auth = ReturnType<typeof createAuth>;
