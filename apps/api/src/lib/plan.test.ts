/**
 * Plan constants + helper unit tests.
 *
 * The DB-backed parts of plan.ts (reserveMonthlyUsage, getUserPlan)
 * need a real D1 binding and are covered by Phase 7.5 integration
 * tests. This file locks in the pure parts:
 *
 *   - PLAN_EVENT_LIMITS values match the pricing page
 *   - PLAN_APP_LIMITS values match the pricing page
 *   - currentYearMonth() formats as YYYY-MM in UTC
 *   - currentYearMonth() rolls over correctly at month/year boundaries
 *
 * If the pricing page ever updates without touching these constants,
 * a test here will fail and force the pricing page + the constants +
 * the test to move together.
 */

import { describe, expect, it } from "vitest";

import {
  PLAN_APP_LIMITS,
  PLAN_EVENT_LIMITS,
  currentYearMonth,
} from "./plan";

describe("PLAN_EVENT_LIMITS", () => {
  it("free tier = 10,000 events/month (matches pricing page)", () => {
    expect(PLAN_EVENT_LIMITS.free).toBe(10_000);
  });

  it("pro tier = 50,000 events/month (matches pricing page)", () => {
    expect(PLAN_EVENT_LIMITS.pro).toBe(50_000);
  });

  it("enterprise = unlimited (-1)", () => {
    expect(PLAN_EVENT_LIMITS.enterprise).toBe(-1);
  });

  it("selfhost = unlimited (-1)", () => {
    expect(PLAN_EVENT_LIMITS.selfhost).toBe(-1);
  });
});

describe("PLAN_APP_LIMITS", () => {
  it("free tier = 1 app (matches pricing page)", () => {
    expect(PLAN_APP_LIMITS.free).toBe(1);
  });

  it("pro tier = 3 apps (matches pricing page)", () => {
    expect(PLAN_APP_LIMITS.pro).toBe(3);
  });

  it("enterprise = unlimited", () => {
    expect(PLAN_APP_LIMITS.enterprise).toBe(-1);
  });

  it("selfhost = unlimited", () => {
    expect(PLAN_APP_LIMITS.selfhost).toBe(-1);
  });
});

describe("currentYearMonth", () => {
  it("formats as YYYY-MM", () => {
    // 2026-04-11 at noon UTC
    const ts = Date.UTC(2026, 3, 11, 12, 0, 0);
    expect(currentYearMonth(ts)).toBe("2026-04");
  });

  it("pads single-digit months with a leading zero", () => {
    // 2026-01-15. January should be "01", not "1"
    const ts = Date.UTC(2026, 0, 15, 0, 0, 0);
    expect(currentYearMonth(ts)).toBe("2026-01");
  });

  it("rolls over at the end of a month", () => {
    // March 31 23:59:59 UTC
    const march = Date.UTC(2026, 2, 31, 23, 59, 59);
    expect(currentYearMonth(march)).toBe("2026-03");

    // April 1 00:00:00 UTC, one second later
    const april = Date.UTC(2026, 3, 1, 0, 0, 0);
    expect(currentYearMonth(april)).toBe("2026-04");
  });

  it("rolls over at the end of a year", () => {
    // December 31 23:59:59 UTC
    const dec = Date.UTC(2026, 11, 31, 23, 59, 59);
    expect(currentYearMonth(dec)).toBe("2026-12");

    // January 1 00:00:00 UTC, new year
    const jan = Date.UTC(2027, 0, 1, 0, 0, 0);
    expect(currentYearMonth(jan)).toBe("2027-01");
  });

  it("uses UTC even on the local-midnight edge", () => {
    // A timestamp that falls in April UTC but March in some local
    // timezones (e.g. UTC-8). We must report UTC consistently so
    // users in different timezones get the same quota window.
    const ts = Date.UTC(2026, 3, 1, 3, 0, 0); // 03:00 UTC on Apr 1
    expect(currentYearMonth(ts)).toBe("2026-04");
  });

  it("handles February correctly (non-leap and leap years)", () => {
    expect(currentYearMonth(Date.UTC(2025, 1, 28, 0, 0, 0))).toBe("2025-02");
    // 2024 is a leap year. Feb 29 exists
    expect(currentYearMonth(Date.UTC(2024, 1, 29, 0, 0, 0))).toBe("2024-02");
    // 2025 is not. March 1 is the next day
    expect(currentYearMonth(Date.UTC(2025, 2, 1, 0, 0, 0))).toBe("2025-03");
  });

  it("defaults to Date.now() when called without arguments", () => {
    // Just verify it returns a well-formed string, we can't pin
    // the value without stubbing the clock.
    const result = currentYearMonth();
    expect(result).toMatch(/^\d{4}-\d{2}$/);
  });
});
