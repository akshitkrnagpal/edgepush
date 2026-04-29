/**
 * Runtime validation for the Worker's environment secrets.
 *
 * Failures here surface BEFORE the cryptic atob/decrypt errors that
 * would otherwise show up deep in a queue consumer or request handler.
 *
 * Pattern:
 *   - Call `validateRequiredEnv(env)` at the entry point of every long-
 *     running surface (HTTP middleware, queue consumer, scheduled handler).
 *   - On failure it throws an `EnvValidationError` whose `.variable` and
 *     `.reason` are safe to log — they never include the secret value
 *     itself, only descriptors like length / decoded byte count.
 *
 * The validation is idempotent and cheap (a regex + atob), so calling
 * it on every request is fine.
 */

const BASE64_RE = /^[A-Za-z0-9+/]+=*$/;

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

/**
 * Returns a non-secret descriptor of the value's shape, for logs.
 * Never includes the value itself.
 */
function describeShape(value: unknown): string {
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  if (typeof value !== "string") return `non-string (${typeof value})`;
  if (value.length === 0) return "empty string";
  return `string of length ${value.length}`;
}

/**
 * Validates that a value is a non-empty string. Returns the trimmed
 * string or throws.
 */
export function validateRequired(value: unknown, name: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new EnvValidationError(name, `expected non-empty string, got ${describeShape(value)}`);
  }
  return value;
}

/**
 * Validates that a value is a base64-encoded string that decodes to
 * the expected number of bytes (when expectedBytes is provided).
 *
 * Returns the trimmed input.
 */
export function validateBase64(
  value: unknown,
  name: string,
  expectedBytes?: number,
): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new EnvValidationError(
      name,
      `expected base64 string, got ${describeShape(value)}`,
    );
  }
  const trimmed = value.trim();
  if (!BASE64_RE.test(trimmed)) {
    throw new EnvValidationError(
      name,
      `not valid base64 (length ${trimmed.length}, contains characters outside [A-Za-z0-9+/=])`,
    );
  }
  let bytes: Uint8Array;
  try {
    const binary = atob(trimmed);
    bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  } catch (err) {
    throw new EnvValidationError(
      name,
      `base64 decode failed: ${(err as Error).message}`,
    );
  }
  if (expectedBytes !== undefined && bytes.length !== expectedBytes) {
    throw new EnvValidationError(
      name,
      `decoded to ${bytes.length} bytes, expected ${expectedBytes}`,
    );
  }
  return trimmed;
}

/**
 * Validates the secrets the server cannot run without. Throws on the
 * first missing or malformed value with a descriptor that's safe to log.
 *
 * Optional secrets (Stripe, Resend, OAuth providers) are not validated
 * here because the surface that needs them returns 501 / falls back
 * gracefully when unset.
 */
export function validateRequiredEnv(env: Record<string, unknown>): void {
  validateBase64(env.ENCRYPTION_KEY, "ENCRYPTION_KEY", 32);
  validateRequired(env.BETTER_AUTH_SECRET, "BETTER_AUTH_SECRET");
  validateRequired(env.BETTER_AUTH_URL, "BETTER_AUTH_URL");
}

/**
 * Like validateRequiredEnv but returns the EnvValidationError instead
 * of throwing. Useful in surfaces that want to report all failures
 * together (e.g. /health/deep) rather than stopping at the first one.
 */
export function checkRequiredEnv(
  env: Record<string, unknown>,
): EnvValidationError[] {
  const errors: EnvValidationError[] = [];
  const checks: Array<() => void> = [
    () => validateBase64(env.ENCRYPTION_KEY, "ENCRYPTION_KEY", 32),
    () => validateRequired(env.BETTER_AUTH_SECRET, "BETTER_AUTH_SECRET"),
    () => validateRequired(env.BETTER_AUTH_URL, "BETTER_AUTH_URL"),
  ];
  for (const check of checks) {
    try {
      check();
    } catch (err) {
      if (err instanceof EnvValidationError) errors.push(err);
      else throw err;
    }
  }
  return errors;
}
