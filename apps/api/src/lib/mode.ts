/**
 * Hosted vs self-host mode gate.
 *
 * edgepush ships as a single codebase under AGPL-3.0. The exact same Worker
 * runs on edgepush.dev (the hosted tier) and on any self-hoster's Cloudflare
 * account. The only runtime difference is whether plan limits, quota
 * enforcement, and retention purging are active.
 *
 * ┌────────────────────────┬─────────────────────────────────────────┐
 * │ HOSTED_MODE            │ Behavior                                │
 * ├────────────────────────┼─────────────────────────────────────────┤
 * │ "true"                 │ Plan/quota/retention enforced           │
 * │ anything else or unset │ No gates — self-host runs unlimited     │
 * └────────────────────────┴─────────────────────────────────────────┘
 *
 * The single source of truth is env.HOSTED_MODE, read through isHosted().
 * Every caller that needs to gate behavior imports this helper — we never
 * compare env.HOSTED_MODE === "true" directly in business logic. That way,
 * if the check ever needs to grow (multi-tenant hosted, staging mode, etc.)
 * we change one function instead of hunting string comparisons through the
 * codebase.
 */

import type { Env } from "../types";

/**
 * Returns true when this Worker is running as the hosted edgepush.dev
 * instance and should enforce plan/quota/retention gates.
 */
export function isHosted(env: Pick<Env, "HOSTED_MODE">): boolean {
  return env.HOSTED_MODE === "true";
}
