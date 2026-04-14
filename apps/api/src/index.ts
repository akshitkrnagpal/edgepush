/**
 * edgepush API worker (optional, performance hot path).
 *
 * Re-exports the Hono app, queue handlers, and scheduled handler
 * from @edgepush/server. This worker exists for lower cold-start
 * latency on the push hot path. Self-hosters can skip it if they
 * deploy apps/app with the embedded API.
 */

export { app } from "@edgepush/server";
// RateLimiter is in a separate entry to avoid importing
// cloudflare:workers in the main bundle (breaks Next.js builds).
export { RateLimiter } from "@edgepush/server/do";

import type { DispatchJob, WebhookJob } from "@edgepush/server";

// Re-export the worker entrypoints from @edgepush/server
import {
  app,
  handleQueue,
  handleDlq,
  handleWebhookQueue,
  handleWebhookDlq,
  handleScheduled,
} from "@edgepush/server";

import type { Env } from "@edgepush/server";

export default {
  fetch: app.fetch,
  async queue(
    batch: MessageBatch<DispatchJob | WebhookJob>,
    env: Env,
  ): Promise<void> {
    switch (batch.queue) {
      case "edgepush-dispatch":
        await handleQueue(
          batch as MessageBatch<DispatchJob>,
          env,
        );
        return;
      case "edgepush-dispatch-dlq":
        await handleDlq(batch as MessageBatch<DispatchJob>, env);
        return;
      case "edgepush-webhook":
        await handleWebhookQueue(
          batch as MessageBatch<WebhookJob>,
          env,
        );
        return;
      case "edgepush-webhook-dlq":
        await handleWebhookDlq(
          batch as MessageBatch<WebhookJob>,
          env,
        );
        return;
      default:
        console.warn(`[queue] unknown queue: ${batch.queue}`);
    }
  },
  async scheduled(
    event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    ctx.waitUntil(handleScheduled(event, env));
  },
};
