import { Hono } from "hono";
import { cors } from "hono/cors";

import { createDb } from "./db";
import { handleQueue } from "./dispatch";
import { sendRouter } from "./routes/send";
import { receiptsRouter } from "./routes/receipts";
import type { AppContext, DispatchJob, Env } from "./types";

export { RateLimiter } from "./rate-limiter";

const app = new Hono<AppContext>();

app.use("*", cors());

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

app.route("/v1", sendRouter);
app.route("/v1", receiptsRouter);

export default {
  fetch: app.fetch,
  async queue(batch: MessageBatch<DispatchJob>, env: Env): Promise<void> {
    await handleQueue(batch, env);
  },
};
