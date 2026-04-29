import { describe, expect, it } from "vitest";
import {
  EnvValidationError,
  checkEnv,
  parseEnv,
  validateEncryptionKey,
} from "./env";

const VALID_KEY = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="; // 32 zero bytes
const VALID_AUTH_SECRET = "long-enough-secret-string-for-tests";
const VALID_AUTH_URL = "https://api.example.com";

const VALID = {
  ENCRYPTION_KEY: VALID_KEY,
  BETTER_AUTH_SECRET: VALID_AUTH_SECRET,
  BETTER_AUTH_URL: VALID_AUTH_URL,
};

describe("parseEnv", () => {
  it("accepts a fully valid env", () => {
    expect(() => parseEnv(VALID)).not.toThrow();
  });

  it("throws EnvValidationError when ENCRYPTION_KEY missing", () => {
    expect(() =>
      parseEnv({
        BETTER_AUTH_SECRET: VALID_AUTH_SECRET,
        BETTER_AUTH_URL: VALID_AUTH_URL,
      }),
    ).toThrow(EnvValidationError);
  });

  it("error names the missing variable", () => {
    try {
      parseEnv({
        BETTER_AUTH_SECRET: VALID_AUTH_SECRET,
        BETTER_AUTH_URL: VALID_AUTH_URL,
      });
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(EnvValidationError);
      expect((err as EnvValidationError).variable).toBe("ENCRYPTION_KEY");
    }
  });

  it("rejects malformed ENCRYPTION_KEY (hex string of wrong byte length)", () => {
    expect(() =>
      parseEnv({
        ...VALID,
        ENCRYPTION_KEY: "a".repeat(64), // 48 bytes when decoded as base64
      }),
    ).toThrow(/decoded to 48 bytes/);
  });

  it("rejects ENCRYPTION_KEY with non-base64 characters", () => {
    expect(() =>
      parseEnv({
        ...VALID,
        ENCRYPTION_KEY: "not-base64!!!",
      }),
    ).toThrow(/not valid base64/);
  });

  it("rejects an invalid BETTER_AUTH_URL", () => {
    expect(() =>
      parseEnv({
        ...VALID,
        BETTER_AUTH_URL: "not-a-url",
      }),
    ).toThrow(EnvValidationError);
  });

  it("error reason never includes the value itself", () => {
    const badKey = "AAAAAAAAAAAAAAAAAAAAAAAA"; // valid base64, 18 bytes
    try {
      parseEnv({ ...VALID, ENCRYPTION_KEY: badKey });
      expect.fail("should have thrown");
    } catch (err) {
      const e = err as EnvValidationError;
      expect(e.reason).not.toContain(badKey);
    }
  });
});

describe("checkEnv", () => {
  it("returns empty array when all valid", () => {
    expect(checkEnv(VALID)).toEqual([]);
  });

  it("collects all errors instead of stopping at the first", () => {
    const errors = checkEnv({});
    expect(errors).toHaveLength(3);
    const variables = errors.map((e) => e.variable).sort();
    expect(variables).toEqual([
      "BETTER_AUTH_SECRET",
      "BETTER_AUTH_URL",
      "ENCRYPTION_KEY",
    ]);
  });
});

describe("validateEncryptionKey", () => {
  it("returns the trimmed key when valid", () => {
    expect(validateEncryptionKey(VALID_KEY)).toBe(VALID_KEY);
  });

  it("trims surrounding whitespace", () => {
    expect(validateEncryptionKey(`  ${VALID_KEY}  `)).toBe(VALID_KEY);
  });

  it("throws EnvValidationError naming ENCRYPTION_KEY for missing", () => {
    try {
      validateEncryptionKey(undefined);
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(EnvValidationError);
      expect((err as EnvValidationError).variable).toBe("ENCRYPTION_KEY");
    }
  });

  it("rejects wrong byte length", () => {
    expect(() => validateEncryptionKey("a".repeat(64))).toThrow(
      /decoded to 48 bytes/,
    );
  });
});
