import { Hono } from "hono";
import { cors } from "hono/cors";

import { handleScheduled } from "./cron";
import { createDb } from "./db";
import { handleDlq, handleQueue } from "./dispatch";
import { createAuth } from "./lib/better-auth";
import { dashboardRouter } from "./routes/dashboard";
import { receiptsRouter } from "./routes/receipts";
import { sendRouter } from "./routes/send";
import { stripeWebhookRouter } from "./routes/webhooks/stripe";
import type { AppContext, DispatchJob, Env } from "./types";
import { SERVER_VERSION } from "./version";

export { RateLimiter } from "./rate-limiter";

const app = new Hono<AppContext>();

// CORS: dashboard routes need credentials, public /v1 routes are open
app.use("/api/*", async (c, next) => {
  const dashboardUrl = c.env.DASHBOARD_URL;
  return cors({
    origin: dashboardUrl ?? c.req.header("origin") ?? "*",
    credentials: true,
    allowHeaders: ["content-type", "authorization"],
  })(c, next);
});

app.use(
  "/v1/*",
  cors({
    origin: "*",
    allowHeaders: ["content-type", "authorization"],
  }),
);

// Inject db into context for every request
app.use("*", async (c, next) => {
  c.set("db", createDb(c.env.DB));
  await next();
});

app.get("/", (c) =>
  c.json({
    name: "edgepush",
    version: SERVER_VERSION,
    docs: "https://github.com/akshitkrnagpal/edgepush",
  }),
);

app.get("/health", (c) => c.json({ status: "ok" }));

/**
 * Deep health check. Pings D1, KV, and reads the killswitch state. Useful
 * when /health says ok but you want to know if any binding is degraded.
 *
 * Gated on an `x-edgepush-operator-token` header matching the
 * OPERATOR_PROBE_TOKEN secret. If the secret is unset, the endpoint is
 * disabled, fail closed so a fresh deployment doesn't accidentally leak
 * binding details. Set the secret with:
 *
 *   pnpm wrangler secret put OPERATOR_PROBE_TOKEN
 *
 * Then curl it from your laptop:
 *
 *   curl -H "x-edgepush-operator-token: $TOKEN" \
 *        https://api.edgepush.dev/health/deep
 */
app.get("/health/deep", async (c) => {
  const expected = c.env.OPERATOR_PROBE_TOKEN;
  if (!expected) {
    return c.json(
      {
        status: "disabled",
        reason:
          "OPERATOR_PROBE_TOKEN secret is not set. The deep health endpoint is disabled by default; set the secret to enable it.",
      },
      503,
    );
  }
  const provided = c.req.header("x-edgepush-operator-token");
  if (!provided || provided !== expected) {
    return c.json({ status: "unauthorized" }, 401);
  }

  type ComponentResult = {
    status: "ok" | "degraded" | "down";
    latency_ms: number;
    detail?: string;
  };

  const results: Record<string, ComponentResult> = {};
  const startTotal = Date.now();

  // D1: SELECT 1. Cheap, doesn't touch any user data, exercises the
  // binding. We use the raw env binding (not the drizzle wrapper) so a
  // drizzle problem doesn't bury a healthy D1 connection.
  {
    const start = Date.now();
    try {
      await c.env.DB.prepare("SELECT 1 as ok").first();
      results.d1 = { status: "ok", latency_ms: Date.now() - start };
    } catch (err) {
      results.d1 = {
        status: "down",
        latency_ms: Date.now() - start,
        detail: err instanceof Error ? err.message : String(err),
      };
    }
  }

  // KV: get a sentinel key that doesn't have to exist. The point is the
  // round-trip; a missing key returns null, which is still a successful
  // operation against the binding.
  {
    const start = Date.now();
    try {
      await c.env.CACHE.get("edgepush:health:probe");
      results.kv = { status: "ok", latency_ms: Date.now() - start };
    } catch (err) {
      results.kv = {
        status: "down",
        latency_ms: Date.now() - start,
        detail: err instanceof Error ? err.message : String(err),
      };
    }
  }

  // Killswitch read. Not technically a binding test (we just used KV
  // above), but the operator wants to know the killswitch state in the
  // same JSON blob, saves a second wrangler invocation.
  {
    const start = Date.now();
    try {
      const killswitch = await c.env.CACHE.get("edgepush:killswitch:send");
      results.killswitch = {
        status: killswitch ? "degraded" : "ok",
        latency_ms: Date.now() - start,
        detail: killswitch ? `set to "${killswitch}"` : "unset",
      };
    } catch (err) {
      results.killswitch = {
        status: "down",
        latency_ms: Date.now() - start,
        detail: err instanceof Error ? err.message : String(err),
      };
    }
  }

  // Queue: Workers doesn't expose a "ping the queue" primitive without
  // actually enqueueing a message, which we don't want as a side effect.
  // We report it as "configured" if the binding exists in the env.
  results.queue = {
    status: c.env.DISPATCH_QUEUE ? "ok" : "down",
    latency_ms: 0,
    detail: c.env.DISPATCH_QUEUE
      ? "binding present (no synthetic enqueue)"
      : "binding missing",
  };

  // Roll-up: any 'down' component flips the overall to 'down'.
  // 'degraded' (e.g. killswitch active) flips to 'degraded'.
  const components = Object.values(results);
  const overall: ComponentResult["status"] = components.some(
    (c) => c.status === "down",
  )
    ? "down"
    : components.some((c) => c.status === "degraded")
      ? "degraded"
      : "ok";

  const httpStatus = overall === "down" ? 503 : 200;
  return c.json(
    {
      status: overall,
      total_ms: Date.now() - startTotal,
      hosted_mode: c.env.HOSTED_MODE === "true",
      components: results,
    },
    httpStatus,
  );
});

// Better Auth: mount at /api/auth/**
app.on(["GET", "POST"], "/api/auth/**", async (c) => {
  const auth = createAuth(c.env);
  return auth.handler(c.req.raw);
});

// Dashboard routes (require Better Auth session cookie)
app.route("/api/dashboard", dashboardRouter);

// Public push API (Bearer API key)
app.route("/v1", sendRouter);
app.route("/v1", receiptsRouter);

// Stripe webhook endpoint, public (signature-verified internally).
// Mounted under /v1 so it lives next to the other public routes.
app.route("/v1", stripeWebhookRouter);

export default {
  fetch: app.fetch,
  async queue(batch: MessageBatch<DispatchJob>, env: Env): Promise<void> {
    // Workers dispatches all queue consumers through a single queue()
    // export, keyed on `batch.queue`. We branch by queue name so the
    // dead-letter queue can have its own handler (observability-only:
    // logs every dead-letter to worker_errors and acks) without a
    // second worker.
    if (batch.queue === "edgepush-dispatch-dlq") {
      await handleDlq(batch, env);
      return;
    }
    await handleQueue(batch, env);
  },
  async scheduled(
    event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    ctx.waitUntil(handleScheduled(event, env));
  },
};
