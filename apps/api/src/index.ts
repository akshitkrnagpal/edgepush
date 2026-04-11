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
    version: "0.0.0",
    docs: "https://github.com/akshitkrnagpal/edgepush",
  }),
);

app.get("/health", (c) => c.json({ status: "ok" }));

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

// Stripe webhook endpoint — public (signature-verified internally).
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
