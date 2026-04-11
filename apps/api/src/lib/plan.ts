/**
 * Plan limits and monthly usage enforcement.
 *
 * The hosted tier gates `/v1/send` on a per-user monthly event count.
 * Self-host bypasses the check entirely (see isHosted() in lib/mode.ts).
 *
 * ┌────────────┬─────────────────────┬─────────────────────────────┐
 * │ plan       │ events/month        │ notes                        │
 * ├────────────┼─────────────────────┼─────────────────────────────┤
 * │ free       │ 10,000              │ edgepush.dev default tier   │
 * │ pro        │ 50,000              │ $29/mo — see COMMERCIAL.md  │
 * │ enterprise │ unlimited (-1)      │ custom contract             │
 * │ selfhost   │ unlimited (-1)      │ self-host synthetic plan    │
 * └────────────┴─────────────────────┴─────────────────────────────┘
 *
 * Enforcement is an atomic `UPDATE ... WHERE events + N <= limit` so
 * two concurrent sends at the boundary can't both slip through. We
 * first upsert the usage row with ON CONFLICT DO NOTHING so the UPDATE
 * always has a row to target.
 *
 * Failed downstream dispatches still count against the quota. This is
 * documented in the pricing page footnote. The tradeoff is simplicity:
 * refunding quota on dispatch failure would require a second write
 * path from the queue consumer and two-way coordination with the
 * produce side, which is premature optimization for pre-launch scale.
 */

import { and, eq, sql } from "drizzle-orm";

import type { Db } from "../db";
import { subscriptions, usageCounters } from "../db/schema";
import { isHosted } from "./mode";
import type { Env } from "../types";

export type PlanName = "free" | "pro" | "enterprise" | "selfhost";

/**
 * Events per calendar month. -1 means unlimited.
 *
 * These live as module-level constants rather than a table because
 * they change at a pricing-decision cadence (rarely) and we want the
 * values visible in code review, not hidden behind a D1 row.
 */
export const PLAN_EVENT_LIMITS: Readonly<Record<PlanName, number>> = {
  free: 10_000,
  pro: 50_000,
  enterprise: -1,
  selfhost: -1,
};

/**
 * Max apps per user. Mirrors the pricing page. Not enforced in Phase 5
 * (apps are created in the dashboard, not /v1/send) but the constants
 * live here so the dashboard's create-app handler can use them later.
 */
export const PLAN_APP_LIMITS: Readonly<Record<PlanName, number>> = {
  free: 1,
  pro: 3,
  enterprise: -1,
  selfhost: -1,
};

/** YYYY-MM in UTC. Used as the usage_counters secondary key. */
export function currentYearMonth(now: number = Date.now()): string {
  const d = new Date(now);
  const year = d.getUTCFullYear();
  const month = (d.getUTCMonth() + 1).toString().padStart(2, "0");
  return `${year}-${month}`;
}

/** Look up a user's current plan. Defaults to "free" if no row exists. */
export async function getUserPlan(db: Db, userId: string): Promise<PlanName> {
  const row = await db
    .select({ plan: subscriptions.plan, status: subscriptions.status })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!row) return "free";

  // A canceled subscription drops the user back to free at renewal time.
  // past_due users keep their plan until Stripe gives up retrying —
  // we're not the dunning service.
  if (row.status === "canceled") return "free";
  return row.plan;
}

export interface QuotaCheckAllowed {
  ok: true;
  plan: PlanName;
  limit: number;
  used: number;
  remaining: number;
}

export interface QuotaCheckDenied {
  ok: false;
  plan: PlanName;
  limit: number;
  used: number;
  yearMonth: string;
}

export type QuotaCheckResult = QuotaCheckAllowed | QuotaCheckDenied;

/**
 * Try to reserve `count` events against the user's monthly quota.
 * Atomic with respect to concurrent sends: the UPDATE fails cleanly if
 * the combined count would exceed the plan limit, and the caller gets
 * a denied result without any row being written.
 *
 * Only runs in hosted mode. Self-host always allows.
 */
export async function reserveMonthlyUsage(
  env: Pick<Env, "HOSTED_MODE">,
  db: Db,
  userId: string,
  count: number,
): Promise<QuotaCheckResult> {
  // Self-host bypass — no-op allow. The synthetic "selfhost" plan is
  // only meaningful in the dashboard UI; the actual check short-circuits
  // before touching the DB.
  if (!isHosted(env)) {
    return {
      ok: true,
      plan: "selfhost",
      limit: -1,
      used: 0,
      remaining: -1,
    };
  }

  const plan = await getUserPlan(db, userId);
  const limit = PLAN_EVENT_LIMITS[plan];

  // Unlimited plan (enterprise, selfhost): still track usage for
  // analytics but never block.
  if (limit === -1) {
    await incrementUsageUnbounded(db, userId, count);
    return {
      ok: true,
      plan,
      limit: -1,
      used: 0,
      remaining: -1,
    };
  }

  const yearMonth = currentYearMonth();
  const now = Date.now();

  // Step 1: ensure the counter row exists. ON CONFLICT DO NOTHING so
  // concurrent inserts don't fight each other.
  await db
    .insert(usageCounters)
    .values({
      userId,
      yearMonth,
      events: 0,
      updatedAt: now,
    })
    .onConflictDoNothing();

  // Step 2: atomic conditional update. If the new total would exceed
  // the limit, the WHERE clause rejects the row and we return zero
  // affected rows.
  const updated = await db
    .update(usageCounters)
    .set({
      events: sql`${usageCounters.events} + ${count}`,
      updatedAt: now,
    })
    .where(
      and(
        eq(usageCounters.userId, userId),
        eq(usageCounters.yearMonth, yearMonth),
        sql`${usageCounters.events} + ${count} <= ${limit}`,
      ),
    )
    .returning({ events: usageCounters.events });

  if (updated.length === 0) {
    // Over limit — fetch the current count for the 429 payload so the
    // client knows how far over they are.
    const existing = await db
      .select({ events: usageCounters.events })
      .from(usageCounters)
      .where(
        and(
          eq(usageCounters.userId, userId),
          eq(usageCounters.yearMonth, yearMonth),
        ),
      )
      .limit(1)
      .then((rows) => rows[0] ?? null);

    return {
      ok: false,
      plan,
      limit,
      used: existing?.events ?? limit,
      yearMonth,
    };
  }

  const newUsed = updated[0]!.events;
  return {
    ok: true,
    plan,
    limit,
    used: newUsed,
    remaining: limit - newUsed,
  };
}

/** Unconditional increment for unlimited plans — tracks usage for analytics. */
async function incrementUsageUnbounded(
  db: Db,
  userId: string,
  count: number,
): Promise<void> {
  const yearMonth = currentYearMonth();
  const now = Date.now();

  await db
    .insert(usageCounters)
    .values({
      userId,
      yearMonth,
      events: count,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [usageCounters.userId, usageCounters.yearMonth],
      set: {
        events: sql`${usageCounters.events} + ${count}`,
        updatedAt: now,
      },
    });
}
