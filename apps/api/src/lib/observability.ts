/**
 * Operator-visible error log.
 *
 * Every operational failure that the operator should know about eventually
 * writes a row to the `worker_errors` table. A daily cron reads the table,
 * emails the operator, and leaves the rows in place (marked resolved by the
 * operator via scripts/operator/*, or just aged out of relevance).
 *
 * ┌──────────────┬────────────────────────────────────────────────────────┐
 * │ kind         │ meaning                                                 │
 * ├──────────────┼────────────────────────────────────────────────────────┤
 * │ dispatch     │ APNs/FCM send failed in the queue consumer              │
 * │ dlq          │ A message was dead-lettered after max_retries           │
 * │ probe_apns   │ Credential probe crashed (not "broken", but crashed)    │
 * │ probe_fcm    │ Same for FCM probes                                     │
 * │ cron         │ A scheduled handler threw                                │
 * │ backup       │ Nightly backup workflow failed                          │
 * │ webhook      │ Outbound webhook delivery failed after retries          │
 * │ stripe       │ Stripe webhook handler swallowed an error               │
 * └──────────────┴────────────────────────────────────────────────────────┘
 *
 * Why a DB table instead of Cloudflare Logs or an external APM?
 *   - Logs rotate aggressively. The daily digest needs to survive
 *     24+ hours without being dropped.
 *   - External APM is another subscription + secret the solo operator
 *     doesn't want to manage in pre-launch scale.
 *   - D1 is already there, and the row format is cheap (a few hundred
 *     bytes per event).
 *
 * The helper swallows its own errors. Logging must never cascade and
 * crash the thing it was logging for.
 */

import type { Db } from "../db";
import { workerErrors } from "../db/schema";
import { generateId } from "./crypto";

export type WorkerErrorKind =
  | "dispatch"
  | "dlq"
  | "probe_apns"
  | "probe_fcm"
  | "cron"
  | "backup"
  | "webhook"
  | "stripe";

export interface LogWorkerErrorInput {
  kind: WorkerErrorKind;
  /**
   * Arbitrary context. We JSON.stringify it and store it as text —
   * no schema, grep-friendly for the operator digest later.
   */
  payload: Record<string, unknown>;
}

/**
 * Write a row to worker_errors. Best-effort: logging failures are
 * themselves logged to console.error but NEVER rethrown. A dispatch
 * error that can't be recorded is still a dispatch error — we don't
 * want the logging path to eat the original signal.
 */
export async function logWorkerError(
  db: Db,
  input: LogWorkerErrorInput,
): Promise<void> {
  try {
    await db.insert(workerErrors).values({
      id: generateId(),
      kind: input.kind,
      payload: JSON.stringify(input.payload),
      resolved: false,
      createdAt: Date.now(),
    });
  } catch (err) {
    console.error(
      `[observability] failed to log worker_errors row (${input.kind}):`,
      err,
    );
  }
}
