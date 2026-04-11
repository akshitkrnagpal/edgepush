/**
 * Credential health probe result shape.
 *
 * The probe runs on a cron against each app's APNs + FCM credentials and
 * writes the result into the corresponding `apns_credentials` /
 * `fcm_credentials` row (`last_checked_at`, `last_check_ok`,
 * `last_check_error`). If the result transitions from OK to BROKEN and
 * the owner hasn't been alerted in the last 7 days, we email them.
 *
 * ┌────────────────┬──────────────────────────────────────────────────┐
 * │ state          │ meaning                                          │
 * ├────────────────┼──────────────────────────────────────────────────┤
 * │ ok             │ Authenticated operation succeeded, creds work.  │
 * │ broken         │ Creds are definitively bad, user must act.      │
 * │ topic_mismatch │ APNs only: JWT is valid but bundleId doesn't     │
 * │                │ match what Apple expects. Config problem, not a  │
 * │                │ credential problem, surface in dashboard but do │
 * │                │ not fire an email alert.                         │
 * │ transient      │ Unknown failure (5xx, network, rate limit). Do   │
 * │                │ not flip the stored state; retry on next cron.   │
 * └────────────────┴──────────────────────────────────────────────────┘
 */

export type ProbeState = "ok" | "broken" | "topic_mismatch" | "transient";

export interface ProbeResult {
  state: ProbeState;
  /**
   * Human-readable error text for "broken" / "topic_mismatch" / "transient"
   * states. Shown verbatim in the dashboard and in the user's alert email.
   * Empty for "ok".
   */
  error: string;
}
