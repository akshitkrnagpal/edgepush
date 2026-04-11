/**
 * Billing routes — hosted tier only.
 *
 * All endpoints here are gated on isHosted(env). Self-hosters get a 501
 * if they hit them. The Checkout session creation endpoint is the sole
 * write-path during normal upgrade flow; everything else is driven by
 * Stripe webhooks landing at /v1/webhooks/stripe (see routes/webhooks/
 * stripe.ts).
 *
 * ┌──────────────────────────────────┬───────────────────────────────┐
 * │ Endpoint                         │ What it does                  │
 * ├──────────────────────────────────┼───────────────────────────────┤
 * │ GET  /subscription               │ Current plan/status for user  │
 * │ POST /checkout                   │ Create a Stripe Checkout      │
 * │                                  │ session and return the URL    │
 * └──────────────────────────────────┴───────────────────────────────┘
 *
 * Mounted at /api/dashboard/billing via dashboardRouter.route().
 */

import { Hono } from "hono";

import { isHosted } from "../lib/mode";
import { getSessionUser } from "../lib/session";
import {
  createCheckoutSession,
  getOrCreateSubscription,
} from "../lib/stripe";
import type { AppContext } from "../types";

export const billingRouter = new Hono<AppContext>();

/**
 * Return the current user's subscription state. Works on self-host too
 * (returns a synthetic "selfhost" plan) so the dashboard can use the
 * same query everywhere.
 */
billingRouter.get("/subscription", async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: "unauthorized" }, 401);

  if (!isHosted(c.env)) {
    return c.json({
      plan: "selfhost" as const,
      status: "active" as const,
      currentPeriodEnd: null as number | null,
    });
  }

  const sub = await getOrCreateSubscription(c.var.db, user.id);
  return c.json({
    plan: sub.plan,
    status: sub.status,
    currentPeriodEnd: sub.currentPeriodEnd,
  });
});

/**
 * POST /checkout — create a Stripe Checkout session and return the URL
 * the client should redirect to. The session carries a signed
 * client_reference_id so the webhook can look the user up safely later.
 */
billingRouter.post("/checkout", async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: "unauthorized" }, 401);

  if (!isHosted(c.env)) {
    return c.json(
      {
        error: "billing_unavailable",
        detail:
          "this edgepush instance is running in self-host mode — there is nothing to upgrade",
      },
      501,
    );
  }

  if (
    !c.env.STRIPE_SECRET_KEY ||
    !c.env.STRIPE_PRO_PRICE_ID ||
    !c.env.STRIPE_REF_HMAC_KEY
  ) {
    return c.json(
      {
        error: "billing_misconfigured",
        detail:
          "Stripe environment variables are missing — operator needs to configure STRIPE_SECRET_KEY, STRIPE_PRO_PRICE_ID, STRIPE_REF_HMAC_KEY",
      },
      500,
    );
  }

  // Ensure a subscription row exists before handing off to Stripe. Even
  // if Checkout is abandoned, we want the row so the user sees "free" in
  // the dashboard immediately.
  await getOrCreateSubscription(c.var.db, user.id);

  const dashboardUrl = c.env.DASHBOARD_URL ?? "https://edgepush.dev";
  const successUrl = `${dashboardUrl}/dashboard?upgraded=1`;
  const cancelUrl = `${dashboardUrl}/pricing?cancelled=1`;

  try {
    const { url } = await createCheckoutSession(c.env, {
      userId: user.id,
      userEmail: user.email,
      successUrl,
      cancelUrl,
    });
    return c.json({ url });
  } catch (err) {
    console.error("[billing] createCheckoutSession failed:", err);
    return c.json(
      {
        error: "checkout_failed",
        detail: err instanceof Error ? err.message : "unknown",
      },
      502,
    );
  }
});
