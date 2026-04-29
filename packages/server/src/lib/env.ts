/**
 * Runtime env validation via @t3-oss/env-core + zod.
 *
 * Failures here surface BEFORE the cryptic atob/decrypt errors that
 * would otherwise show up deep in a queue consumer or request handler.
 *
 * Pattern:
 *   - Call `parseEnv(env)` at the entry point of every long-running
 *     surface (HTTP middleware, queue consumer, scheduled handler).
 *   - On failure it throws an `EnvValidationError` whose `.variable` and
 *     `.reason` are safe to log — they never include the secret value
 *     itself, only descriptors like decoded byte count.
 *
 * Workers note: `createEnv` is per-invocation here (not a module-level
 * singleton) because the Worker env binding is passed per-request, not
 * read from `process.env`. Validation cost is a few zod refines —
 * negligible.
 */

import { createEnv } from "@t3-oss/env-core";
import { z, type ZodError } from "zod";

/**
 * Base64 string that decodes to exactly `expectedBytes` bytes. The error
 * message is intentionally bounded — it reports the length of the input
 * and the number of decoded bytes, but never the value itself.
 */
const base64WithBytes = (expectedBytes: number) =>
  z
    .string()
    .min(1, `expected base64 string, got empty string`)
    .superRefine((raw, ctx) => {
      const trimmed = raw.trim();
      if (!/^[A-Za-z0-9+/]+=*$/.test(trimmed)) {
        ctx.addIssue({
          code: "custom",
          message: `not valid base64 (length ${trimmed.length}, contains characters outside [A-Za-z0-9+/=])`,
        });
        return;
      }
      let decoded: number;
      try {
        decoded = atob(trimmed).length;
      } catch (err) {
        ctx.addIssue({
          code: "custom",
          message: `base64 decode failed: ${(err as Error).message}`,
        });
        return;
      }
      if (decoded !== expectedBytes) {
        ctx.addIssue({
          code: "custom",
          message: `decoded to ${decoded} bytes, expected ${expectedBytes}`,
        });
      }
    });

/**
 * Schema for the secrets the server cannot run without. Optional secrets
 * (Stripe, Resend, OAuth providers) are not enforced here because the
 * surface that needs them returns 501 / falls back gracefully when unset.
 */
const requiredEnvSchema = {
  ENCRYPTION_KEY: base64WithBytes(32),
  BETTER_AUTH_SECRET: z.string().min(1),
  BETTER_AUTH_URL: z.url(),
} as const;

/**
 * Surfaced when validation fails. `.variable` and `.reason` are bounded
 * to schema names + non-secret descriptors — safe to log.
 */
export class EnvValidationError extends Error {
  readonly variable: string;
  readonly reason: string;

  constructor(variable: string, reason: string) {
    super(`Invalid env var ${variable}: ${reason}`);
    this.name = "EnvValidationError";
    this.variable = variable;
    this.reason = reason;
  }
}

function fromZodError(err: ZodError): EnvValidationError[] {
  return err.issues.map((issue) => {
    const variable = String(issue.path[0] ?? "(unknown)");
    return new EnvValidationError(variable, issue.message);
  });
}

/**
 * Validates required env. Throws the first EnvValidationError on failure.
 */
export function parseEnv(env: unknown): void {
  try {
    createEnv({
      server: requiredEnvSchema,
      runtimeEnv: env as Record<string, string | undefined>,
      emptyStringAsUndefined: true,
      onValidationError: (issues) => {
        const errors = fromZodError({ issues } as ZodError);
        throw errors[0] ?? new Error("env validation failed");
      },
    });
  } catch (err) {
    if (err instanceof EnvValidationError) throw err;
    throw err;
  }
}

/**
 * Like parseEnv but returns all validation errors instead of throwing
 * on the first. Used by /health/deep so the operator sees every
 * misconfigured variable in one response.
 */
export function checkEnv(env: unknown): EnvValidationError[] {
  const result = z.object(requiredEnvSchema).safeParse(env);
  if (result.success) return [];
  return fromZodError(result.error);
}

/**
 * Validates just `ENCRYPTION_KEY`. Used by `importKey` in crypto.ts so
 * a bad key surfaces with the variable name instead of a cryptic atob
 * error. Throws EnvValidationError on failure.
 */
export function validateEncryptionKey(value: unknown): string {
  const result = base64WithBytes(32).safeParse(value);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new EnvValidationError(
      "ENCRYPTION_KEY",
      issue?.message ?? "invalid",
    );
  }
  return result.data.trim();
}
