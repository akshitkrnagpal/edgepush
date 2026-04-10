import { Hono } from "hono";
import { and, eq, inArray } from "drizzle-orm";

import { authenticateApiKey } from "../lib/auth";
import { messages } from "../db/schema";
import type { AppContext } from "../types";

export const receiptsRouter = new Hono<AppContext>();

receiptsRouter.get("/receipts/:id", async (c) => {
  const authedApp = await authenticateApiKey(
    c.var.db,
    c.req.header("authorization") ?? null,
  );
  if (!authedApp) {
    return c.json({ error: "invalid_api_key" }, 401);
  }

  const id = c.req.param("id");
  const row = await c.var.db
    .select({
      id: messages.id,
      status: messages.status,
      error: messages.error,
      tokenInvalid: messages.tokenInvalid,
      createdAt: messages.createdAt,
      updatedAt: messages.updatedAt,
    })
    .from(messages)
    .where(and(eq(messages.id, id), eq(messages.appId, authedApp.appId)))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!row) {
    return c.json({ error: "not_found" }, 404);
  }

  return c.json(row);
});

receiptsRouter.post("/receipts/batch", async (c) => {
  const authedApp = await authenticateApiKey(
    c.var.db,
    c.req.header("authorization") ?? null,
  );
  if (!authedApp) {
    return c.json({ error: "invalid_api_key" }, 401);
  }

  const body = (await c.req.json()) as { ids?: unknown };
  if (!Array.isArray(body?.ids) || body.ids.length === 0) {
    return c.json({ error: "missing_ids" }, 400);
  }

  const ids = body.ids.filter((x): x is string => typeof x === "string");
  if (ids.length === 0) return c.json({ data: [] });
  if (ids.length > 500) {
    return c.json({ error: "too_many_ids", max: 500 }, 400);
  }

  const rows = await c.var.db
    .select({
      id: messages.id,
      status: messages.status,
      error: messages.error,
      tokenInvalid: messages.tokenInvalid,
      createdAt: messages.createdAt,
      updatedAt: messages.updatedAt,
    })
    .from(messages)
    .where(
      and(inArray(messages.id, ids), eq(messages.appId, authedApp.appId)),
    );

  return c.json({ data: rows });
});
