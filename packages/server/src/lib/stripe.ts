/**
 * Stripe integration for the hosted edgepush tier.
 *
 * We deliberately do NOT use the `stripe` npm package, it's Node-heavy
 * and drags in a lot of code that Cloudflare Workers doesn't need. Every
 * Stripe API call is a plain fetch() to api.stripe.com, and every webhook
 * signature is verified with Web Crypto.
 *
 * ┌────────────────────┬────────────────────────────────────────────┐
 * │ Flow               │ Components                                  │
 * ├────────────────────┼────────────────────────────────────────────┤
 * │ 1. User clicks     │ dashboard → POST /api/dashboard/billing/    │
 * │    "Upgrade"       │ checkout → createCheckoutSession() → Stripe │
 * │                    │ → redirect URL returned to client           │
 * │ 2. User pays       │ Stripe hosted Checkout UI                   │
 * │ 3. Stripe webhook  │ POST /v1/webhooks/stripe → verifyWebhook    │
 * │                    │ Signature → handleStripeEvent → subscription│
 * │                    │ row upserted in D1                          │
 * │ 4. Redirect back   │ Stripe → /dashboard?upgraded=1 → UI refresh │
 * └────────────────────┴────────────────────────────────────────────┘
 *
 * client_reference_id security:
 *   We pass a signed "<userId>.<hmac>" string to Stripe as the
 *   client_reference_id so that when the webhook fires, we can look up
 *   the user without trusting the Stripe-supplied email (which may not
 *   match the edgepush sign-in email, cardholders pay with a different
 *   email all the time). The HMAC prevents an attacker from forging a
 *   session with an arbitrary user ID.
 */

import { eq } from "drizzle-orm";

import type { Db } from "../db";
import { subscriptions } from "../db/schema";
import type { Env } from "../types";

const STRIPE_API = "https://api.stripe.com/v1";

// ----- Client reference ID signing (HMAC-SHA256) -----

/** URL-safe base64 (no padding), matches Stripe's 200-char client_reference_id charset. */
function base64url(bytes: ArrayBuffer): string {
  const b64 = btoa(String.fromCharCode(...new Uint8Array(bytes)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmacSha256(
  keyString: string,
  message: string,
): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(keyString),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  return crypto.subtle.sign("HMAC", key, encoder.encode(message));
}

export async function signClientReferenceId(
  env: Pick<Env, "STRIPE_REF_HMAC_KEY">,
  userId: string,
): Promise<string> {
  if (!env.STRIPE_REF_HMAC_KEY) {
    throw new Error("STRIPE_REF_HMAC_KEY is not configured");
  }
  const mac = await hmacSha256(env.STRIPE_REF_HMAC_KEY, userId);
  return `${userId}.${base64url(mac)}`;
}

/**
 * Parse `<userId>.<hmac>` and verify the HMAC. Returns the userId only if
 * the signature matches. Never throws, returns null on any parse or
 * verification failure so the webhook handler can reject the event cleanly.
 */
export async function verifyClientReferenceId(
  env: Pick<Env, "STRIPE_REF_HMAC_KEY">,
  ref: string | null | undefined,
): Promise<string | null> {
  if (!ref || !env.STRIPE_REF_HMAC_KEY) return null;
  const dot = ref.lastIndexOf(".");
  if (dot <= 0 || dot === ref.length - 1) return null;
  const userId = ref.slice(0, dot);
  const sig = ref.slice(dot + 1);
  const expected = base64url(
    await hmacSha256(env.STRIPE_REF_HMAC_KEY, userId),
  );
  if (!constantTimeEqual(sig, expected)) return null;
  return userId;
}

/** Constant-time string equality to blunt timing side-channels. */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

// ----- Stripe webhook signature verification -----

/**
 * Verify a Stripe webhook signature header.
 *
 * Stripe-Signature: t=1234567890,v1=<hex>,v1=<hex>
 *
 * We compute HMAC-SHA256(secret, "<t>.<body>") and constant-time compare
 * against every `v1` value in the header. Any match passes. Expired
 * timestamps (> 5 min old) are rejected to blunt replay attacks.
 */
export async function verifyWebhookSignature(
  secret: string,
  sigHeader: string | null,
  body: string,
  toleranceMs: number = 5 * 60 * 1000,
): Promise<boolean> {
  if (!sigHeader) return false;

  const parts = sigHeader.split(",").map((p) => p.trim());
  let timestamp: string | null = null;
  const v1Signatures: string[] = [];
  for (const part of parts) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    const key = part.slice(0, eq);
    const value = part.slice(eq + 1);
    if (key === "t") timestamp = value;
    else if (key === "v1") v1Signatures.push(value);
  }

  if (!timestamp || v1Signatures.length === 0) return false;
  const tsMs = Number(timestamp) * 1000;
  if (!Number.isFinite(tsMs)) return false;
  if (Math.abs(Date.now() - tsMs) > toleranceMs) return false;

  const signedPayload = `${timestamp}.${body}`;
  const mac = await hmacSha256(secret, signedPayload);
  const expected = toHex(mac);

  for (const sig of v1Signatures) {
    if (constantTimeEqual(sig, expected)) return true;
  }
  return false;
}

function toHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ----- Stripe API calls -----

/**
 * Create a hosted Checkout session for the Pro tier.
 * Returns the redirect URL the client should follow.
 */
export async function createCheckoutSession(
  env: Pick<
    Env,
    "STRIPE_SECRET_KEY" | "STRIPE_PRO_PRICE_ID" | "STRIPE_REF_HMAC_KEY"
  >,
  opts: {
    userId: string;
    userEmail: string;
    successUrl: string;
    cancelUrl: string;
  },
): Promise<{ url: string; sessionId: string }> {
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_PRO_PRICE_ID) {
    throw new Error("Stripe billing is not configured on this deployment");
  }

  const clientRef = await signClientReferenceId(env, opts.userId);

  const params = new URLSearchParams();
  params.set("mode", "subscription");
  params.set("line_items[0][price]", env.STRIPE_PRO_PRICE_ID);
  params.set("line_items[0][quantity]", "1");
  params.set("client_reference_id", clientRef);
  params.set("customer_email", opts.userEmail);
  params.set("success_url", opts.successUrl);
  params.set("cancel_url", opts.cancelUrl);
  // Let Stripe create the Customer on first successful payment; we'll
  // record the stripeCustomerId from the checkout.session.completed webhook.
  params.set("allow_promotion_codes", "true");

  const res = await fetch(`${STRIPE_API}/checkout/sessions`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Stripe Checkout session create failed: ${res.status} ${body.slice(0, 400)}`);
  }

  const json = (await res.json()) as { id: string; url: string };
  return { url: json.url, sessionId: json.id };
}

/**
 * Create a Stripe Billing Portal session. The portal lets the customer
 * cancel, update their payment method, and view invoices without
 * emailing the operator.
 *
 * Prerequisites: the user must already have a stripeCustomerId (set
 * when checkout.session.completed fires). Calling this for a user who
 * never upgraded is a caller error.
 */
export async function createBillingPortalSession(
  env: Pick<Env, "STRIPE_SECRET_KEY">,
  opts: {
    customerId: string;
    returnUrl: string;
  },
): Promise<{ url: string }> {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error("Stripe billing is not configured on this deployment");
  }

  const params = new URLSearchParams();
  params.set("customer", opts.customerId);
  params.set("return_url", opts.returnUrl);

  const res = await fetch(`${STRIPE_API}/billing_portal/sessions`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Stripe Billing Portal session create failed: ${res.status} ${body.slice(0, 400)}`,
    );
  }

  const json = (await res.json()) as { url: string };
  return { url: json.url };
}

// ----- Subscription row helpers -----

/**
 * Ensure a subscriptions row exists for the user. New users land on
 * plan='free', status='active' via ON CONFLICT DO NOTHING. Returns the
 * current row (whether just created or pre-existing).
 */
export async function getOrCreateSubscription(
  db: Db,
  userId: string,
): Promise<{
  userId: string;
  plan: "free" | "pro" | "enterprise" | "selfhost";
  status: "active" | "past_due" | "canceled";
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodStart: number | null;
  currentPeriodEnd: number | null;
}> {
  const now = Date.now();
  await db
    .insert(subscriptions)
    .values({
      userId,
      plan: "free",
      status: "active",
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing({ target: subscriptions.userId });

  const row = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1)
    .then((rows) => rows[0]);

  if (!row) {
    // This should be unreachable given the insert above, but TypeScript
    // doesn't know that and D1 could theoretically race us.
    throw new Error(`subscriptions row missing for user ${userId}`);
  }
  return row;
}

/**
 * Update subscription state from a Stripe subscription object. Used by
 * multiple webhook event handlers.
 */
export async function upsertSubscriptionFromStripe(
  db: Db,
  userId: string,
  sub: StripeSubscriptionObject,
): Promise<void> {
  const plan = mapPriceIdToPlan(sub.items.data[0]?.price?.id);
  const status = mapStripeStatusToInternal(sub.status);

  const now = Date.now();
  await db
    .insert(subscriptions)
    .values({
      userId,
      plan,
      status,
      stripeCustomerId: typeof sub.customer === "string" ? sub.customer : null,
      stripeSubscriptionId: sub.id,
      currentPeriodStart: sub.current_period_start
        ? sub.current_period_start * 1000
        : null,
      currentPeriodEnd: sub.current_period_end
        ? sub.current_period_end * 1000
        : null,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: subscriptions.userId,
      set: {
        plan,
        status,
        stripeCustomerId:
          typeof sub.customer === "string" ? sub.customer : null,
        stripeSubscriptionId: sub.id,
        currentPeriodStart: sub.current_period_start
          ? sub.current_period_start * 1000
          : null,
        currentPeriodEnd: sub.current_period_end
          ? sub.current_period_end * 1000
          : null,
        updatedAt: now,
      },
    });
}

// ----- Type definitions for the subset of Stripe objects we touch -----

/**
 * Minimal shape of a Stripe Subscription. We only type the fields we
 * actually read. The stripe-node package has a full type, we can't use
 * it on Workers, so this hand-rolled subset is the tradeoff.
 */
export interface StripeSubscriptionObject {
  id: string;
  status:
    | "active"
    | "past_due"
    | "canceled"
    | "incomplete"
    | "incomplete_expired"
    | "trialing"
    | "unpaid"
    | "paused";
  customer: string | { id: string };
  current_period_start?: number;
  current_period_end?: number;
  items: {
    data: Array<{
      price: { id: string };
    }>;
  };
}

export interface StripeCheckoutSessionObject {
  id: string;
  client_reference_id: string | null;
  customer: string | null;
  customer_email: string | null;
  subscription: string | null;
  mode: string;
  payment_status: string;
}

export interface StripeInvoiceObject {
  id: string;
  customer: string | null;
  subscription: string | null;
}

export interface StripeEventObject {
  id: string;
  type: string;
  data: { object: unknown };
  created: number;
}

function mapPriceIdToPlan(
  priceId: string | undefined,
): "free" | "pro" | "enterprise" | "selfhost" {
  // In v1 we only sell one paid tier. If Stripe ever returns a price we
  // don't recognize, map it to "pro" as the safe default, the admin
  // will fix it manually in Stripe and the subscription will update on
  // the next webhook.
  if (!priceId) return "free";
  return "pro";
}

function mapStripeStatusToInternal(
  s: StripeSubscriptionObject["status"],
): "active" | "past_due" | "canceled" {
  switch (s) {
    case "active":
    case "trialing":
      return "active";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "canceled":
    case "incomplete_expired":
      return "canceled";
    case "incomplete":
    case "paused":
      // Treat as past_due so the user sees a clear "action required"
      // state in the dashboard rather than being silently downgraded.
      return "past_due";
    default:
      return "canceled";
  }
}

/**
 * Fetch a Stripe Subscription object by ID. Used by the webhook handler
 * when the event only carries a reference ID and we need the full shape.
 */
export async function fetchStripeSubscription(
  env: Pick<Env, "STRIPE_SECRET_KEY">,
  subscriptionId: string,
): Promise<StripeSubscriptionObject> {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  const res = await fetch(`${STRIPE_API}/subscriptions/${subscriptionId}`, {
    headers: { authorization: `Bearer ${env.STRIPE_SECRET_KEY}` },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Stripe subscription fetch failed: ${res.status} ${body.slice(0, 400)}`,
    );
  }
  return (await res.json()) as StripeSubscriptionObject;
}

