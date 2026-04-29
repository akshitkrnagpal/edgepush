import { describe, expect, it } from "vitest";
import {
  EnvValidationError,
  checkRequiredEnv,
  validateBase64,
  validateRequired,
  validateRequiredEnv,
} from "./env-validation";

const VALID_KEY = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="; // 32 zero bytes
const VALID_AUTH_SECRET = "long-enough-secret-string-for-tests";
const VALID_AUTH_URL = "https://api.example.com";

describe("validateBase64", () => {
  it("accepts a valid 32-byte base64 string when expectedBytes=32", () => {
    expect(validateBase64(VALID_KEY, "X", 32)).toBe(VALID_KEY);
  });

  it("trims surrounding whitespace", () => {
    expect(validateBase64(`  ${VALID_KEY}  `, "X", 32)).toBe(VALID_KEY);
  });

  it("rejects undefined", () => {
    expect(() => validateBase64(undefined, "X", 32)).toThrow(
      EnvValidationError,
    );
  });

  it("rejects empty string", () => {
    expect(() => validateBase64("", "X", 32)).toThrow(EnvValidationError);
  });

  it("rejects strings with characters outside the base64 alphabet", () => {
    expect(() => validateBase64("not-base64-at-all!!!", "X", 32)).toThrow(
      /not valid base64/,
    );
  });

  it("rejects hex strings of the wrong decoded length", () => {
    // 64 hex chars decode as base64 to 48 bytes, not 32. Common mistake
    // when someone uses `openssl rand -hex 32` instead of `-base64 32`.
    const hex = "a".repeat(64);
    expect(() => validateBase64(hex, "X", 32)).toThrow(
      /decoded to 48 bytes, expected 32/,
    );
  });

  it("rejects base64 of the wrong byte length", () => {
    // 24 bytes encoded as base64 = "QUJDRUZHSElKS0xNTk9QUVJTVFVWV1g=" (32 chars)
    const tooShort = btoa("ABCDEFGHIJKLMNOPQRSTUVWX");
    expect(() => validateBase64(tooShort, "X", 32)).toThrow(
      /decoded to 24 bytes, expected 32/,
    );
  });

  it("error includes the variable name", () => {
    try {
      validateBase64("not-base64-at-all!!!", "MY_VAR", 32);
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(EnvValidationError);
      const e = err as EnvValidationError;
      expect(e.variable).toBe("MY_VAR");
      expect(e.message).toContain("MY_VAR");
    }
  });

  it("error reason never includes the value itself", () => {
    const secret = "AAAAAAAAAAAAAAAAAAAAAAAA"; // valid base64 but wrong length (18 bytes)
    try {
      validateBase64(secret, "MY_KEY", 32);
      expect.fail("should have thrown");
    } catch (err) {
      const e = err as EnvValidationError;
      expect(e.reason).not.toContain(secret);
    }
  });
});

describe("validateRequired", () => {
  it("accepts a non-empty string", () => {
    expect(validateRequired("hello", "X")).toBe("hello");
  });

  it("rejects undefined", () => {
    expect(() => validateRequired(undefined, "X")).toThrow(EnvValidationError);
  });

  it("rejects empty string", () => {
    expect(() => validateRequired("", "X")).toThrow(EnvValidationError);
  });

  it("rejects non-strings", () => {
    expect(() => validateRequired(42 as unknown as string, "X")).toThrow(
      EnvValidationError,
    );
  });
});

describe("validateRequiredEnv", () => {
  it("passes with all required values", () => {
    expect(() =>
      validateRequiredEnv({
        ENCRYPTION_KEY: VALID_KEY,
        BETTER_AUTH_SECRET: VALID_AUTH_SECRET,
        BETTER_AUTH_URL: VALID_AUTH_URL,
      }),
    ).not.toThrow();
  });

  it("throws on missing ENCRYPTION_KEY", () => {
    expect(() =>
      validateRequiredEnv({
        BETTER_AUTH_SECRET: VALID_AUTH_SECRET,
        BETTER_AUTH_URL: VALID_AUTH_URL,
      }),
    ).toThrow(/ENCRYPTION_KEY/);
  });

  it("throws on malformed ENCRYPTION_KEY (hex)", () => {
    expect(() =>
      validateRequiredEnv({
        ENCRYPTION_KEY: "f".repeat(64),
        BETTER_AUTH_SECRET: VALID_AUTH_SECRET,
        BETTER_AUTH_URL: VALID_AUTH_URL,
      }),
    ).toThrow(/ENCRYPTION_KEY/);
  });

  it("throws on missing BETTER_AUTH_SECRET", () => {
    expect(() =>
      validateRequiredEnv({
        ENCRYPTION_KEY: VALID_KEY,
        BETTER_AUTH_URL: VALID_AUTH_URL,
      }),
    ).toThrow(/BETTER_AUTH_SECRET/);
  });
});

describe("checkRequiredEnv", () => {
  it("returns empty array when all valid", () => {
    expect(
      checkRequiredEnv({
        ENCRYPTION_KEY: VALID_KEY,
        BETTER_AUTH_SECRET: VALID_AUTH_SECRET,
        BETTER_AUTH_URL: VALID_AUTH_URL,
      }),
    ).toEqual([]);
  });

  it("collects all errors instead of stopping at the first", () => {
    const errors = checkRequiredEnv({});
    expect(errors).toHaveLength(3);
    const variables = errors.map((e) => e.variable).sort();
    expect(variables).toEqual([
      "BETTER_AUTH_SECRET",
      "BETTER_AUTH_URL",
      "ENCRYPTION_KEY",
    ]);
  });
});
