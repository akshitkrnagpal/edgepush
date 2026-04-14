/**
 * Catch-all API route handler.
 *
 * Imports the Hono app from @edgepush/server (bundled at build time
 * via transpilePackages in next.config.ts). Passes Cloudflare Worker
 * bindings from getCloudflareContext() so every route handler has
 * access to D1, KV, Queue, etc.
 *
 * This makes apps/app a self-contained deployment: no separate API
 * worker needed. Self-hosters deploy ONE worker and get the full
 * API + dashboard.
 */

import { app } from "@edgepush/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

async function handler(req: Request) {
  const ctx = await getCloudflareContext();

  // OpenNext may rewrite the request URL to an internal origin
  // (e.g. http://localhost:port). Better Auth derives cookie domains
  // and origin checks from the request URL, so we must ensure it
  // carries the real public origin. Use BETTER_AUTH_URL as the
  // canonical origin, falling back to the Host header.
  const publicOrigin = (ctx.env as Record<string, unknown>)
    .BETTER_AUTH_URL as string | undefined;
  if (publicOrigin) {
    const original = new URL(req.url);
    const target = new URL(publicOrigin);
    if (
      original.hostname !== target.hostname ||
      original.protocol !== target.protocol
    ) {
      const corrected = new URL(
        original.pathname + original.search,
        publicOrigin,
      );
      req = new Request(corrected.toString(), {
        method: req.method,
        headers: req.headers,
        body: req.body,
      });
    }
  }

  return app.fetch(req, ctx.env, ctx.ctx);
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const PATCH = handler;
