/**
 * Webhook delivery queue consumer.
 *
 * Receives failed webhook delivery jobs from the push dispatch consumer
 * and retries them with the queue's built-in exponential backoff. After
 * max_retries (3, configured in wrangler.jsonc), jobs land in the
 * edgepush-webhook-dlq where the DLQ consumer logs them to
 * worker_errors for the operator digest.
 *
 * Flow:
 *   dispatch.ts enqueues a WebhookJob into WEBHOOK_QUEUE on first delivery
 *   → this consumer retries dispatchWebhook up to 3x
 *   → success: ack
 *   → permanent failure (4xx that isn't 408/429): ack + log to worker_errors
 *   → still failing after max_retries: DLQ picks it up
 *
 * DLQ for webhooks: separate from the dispatch DLQ so webhook delivery
 * failures don't mix with push dispatch failures in the operator's
 * triage queue.
 */

import { createDb } from "./db";
import { dispatchWebhook, type WebhookPayload } from "./lib/webhook";
import { logWorkerError } from "./lib/observability";
import type { Env, WebhookJob } from "./types";

/**
 * HTTP status codes that indicate a permanent failure (don't retry,
 * the customer's endpoint is misconfigured, not temporarily down).
 * 408 (timeout) and 429 (rate limit) are NOT in this set because
 * they're transient and worth retrying.
 */
const PERMANENT_4XX = new Set([400, 401, 403, 404, 405, 410]);

export async function handleWebhookQueue(
  batch: MessageBatch<WebhookJob>,
  env: Env,
): Promise<void> {
  const db = createDb(env.DB);

  for (const msg of batch.messages) {
    const job = msg.body;
    const payload: WebhookPayload = {
      event: job.payload.event as WebhookPayload["event"],
      messageId: job.payload.messageId,
      appId: job.payload.appId,
      status: job.payload.status,
      error: job.payload.error ?? null,
      tokenInvalid: job.payload.tokenInvalid ?? false,
      timestamp: job.payload.timestamp,
    };

    try {
      const result = await dispatchWebhook(job.url, job.secret, payload);

      if (result.ok) {
        msg.ack();
        continue;
      }

      // Permanent 4xx: the customer's endpoint is rejecting the payload
      // for a reason that won't change on retry. Log and ack.
      if (PERMANENT_4XX.has(result.status)) {
        await logWorkerError(db, {
          kind: "webhook",
          payload: {
            messageId: job.payload.messageId,
            appId: job.payload.appId,
            event: job.payload.event,
            url: job.url,
            status: result.status,
            reason: "permanent_4xx",
            attempt: msg.attempts,
          },
        });
        msg.ack();
        continue;
      }

      // Transient failure (5xx, 408, 429): let the queue retry via
      // msg.retry(). Cloudflare Queues handles the backoff.
      msg.retry();
    } catch (err) {
      // Network error or thrown exception: retry.
      console.error(
        `[webhook-consumer] threw for ${job.payload.messageId}:`,
        err,
      );
      msg.retry();
    }
  }
}

/**
 * Webhook DLQ consumer. Jobs that exhaust all retries land here.
 * Log to worker_errors for the operator digest and ack unconditionally.
 */
export async function handleWebhookDlq(
  batch: MessageBatch<WebhookJob>,
  env: Env,
): Promise<void> {
  const db = createDb(env.DB);

  for (const msg of batch.messages) {
    const job = msg.body;
    await logWorkerError(db, {
      kind: "webhook",
      payload: {
        messageId: job.payload.messageId,
        appId: job.payload.appId,
        event: job.payload.event,
        url: job.url,
        reason: "exhausted_retries",
        attempts: msg.attempts,
      },
    });
    msg.ack();
  }
}
