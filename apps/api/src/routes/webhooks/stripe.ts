/**
 * Stripe webhook endpoint at POST /v1/webhooks/stripe.
 *
 * Stripe delivers events at-least-once, so everything here must be
 * idempotent. The sequence:
 *
 *   1. Read the raw body (needed for signature verification, do NOT
 *      parse it into JSON first, the signature is computed over the
 *      exact bytes Stripe sent).
 *   2. Verify the Stripe-Signature header against STRIPE_WEBHOOK_SECRET.
 *      Reject with 400 if invalid or timestamp > 5 min old.
 *   3. Check stripe_events for event.id, if we've seen it, return 200
 *      (idempotent no-op).
 *   4. Dispatch on event.type. Five cases matter in v1:
 *        - checkout.session.completed
 *        - customer.subscription.updated
 *        - customer.subscription.deleted
 *        - invoice.payment_failed
 *        - invoice.payment_succeeded
 *      Unknown event types are recorded in stripe_events and ignored.
 *   5. Insert into stripe_events so a retry short-circuits at step 3.
 *
 * ASCII flow:
 *
 *   POST /v1/webhooks/stripe
 *     │
 *     ├── verify Stripe-Signature ──▶ 400 on failure
 *     │
 *     ├── dedupe on stripe_events.id ──▶ 200 (no-op)
 *     │
 *     ├── event.type
 *     │     ├── checkout.session.completed ─┐
 *     │     ├── customer.subscription.*     ├─▶ upsert subscriptions row
 *     │     ├── invoice.payment_failed      ├─▶ + email user
 *     │     └── invoice.payment_succeeded   ┘
 *     │
 *     └── INSERT stripe_events(id, type, processed_at)
 *           │
 *           └── 200 { received: true }
 *
 * We NEVER 5xx to Stripe on a known-bad event. Stripe retries 5xx
 * aggressively (~72 hours of exponential backoff) and we'd rather
 * log-and-swallow a parse error than eat the retry budget.
 */

import { Hono } from "hono";
import { eq } from "drizzle-orm";

import { stripeEvents, subscriptions, user } from "../../db/schema";
import { sendEmail } from "../../lib/email";
import {
  fetchStripeSubscription,
  upsertSubscriptionFromStripe,
  verifyClientReferenceId,
  verifyWebhookSignature,
  type StripeCheckoutSessionObject,
  type StripeEventObject,
  type StripeInvoiceObject,
  type StripeSubscriptionObject,
} from "../../lib/stripe";
import type { AppContext, Env } from "../../types";
import type { Db } from "../../db";

export const stripeWebhookRouter = new Hono<AppContext>();

stripeWebhookRouter.post("/webhooks/stripe", async (c) => {
  if (!c.env.STRIPE_WEBHOOK_SECRET) {
    // Self-host or misconfigured hosted. Stripe shouldn't be calling
    // us in the first place, return 503 so the operator notices.
    return c.json(
      { error: "webhook_secret_not_configured" },
      503,
    );
  }

  // 1. Read raw body. Hono's c.req.text() returns the bytes as a string
  //    without any JSON parsing or whitespace normalization, which is
  //    what the signature algorithm expects.
  const body = await c.req.text();
  const sigHeader = c.req.header("stripe-signature") ?? null;

  // 2. Verify signature.
  const valid = await verifyWebhookSignature(
    c.env.STRIPE_WEBHOOK_SECRET,
    sigHeader,
    body,
  );
  if (!valid) {
    return c.json({ error: "invalid_signature" }, 400);
  }

  // Safe to parse now, we've authenticated the sender.
  let event: StripeEventObject;
  try {
    event = JSON.parse(body) as StripeEventObject;
  } catch {
    return c.json({ error: "invalid_json" }, 400);
  }

  if (!event.id || !event.type) {
    return c.json({ error: "malformed_event" }, 400);
  }

  // 3. Idempotency check.
  const alreadyProcessed = await c.var.db
    .select({ id: stripeEvents.id })
    .from(stripeEvents)
    .where(eq(stripeEvents.id, event.id))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (alreadyProcessed) {
    return c.json({ received: true, duplicate: true });
  }

  // 4. Dispatch. Wrapped in try/catch so any unknown shape becomes a
  //    swallowed warning, not a 5xx that triggers Stripe's retry hammer.
  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(
          c.env,
          c.var.db,
          event.data.object as StripeCheckoutSessionObject,
        );
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(
          c.var.db,
          event.data.object as StripeSubscriptionObject,
        );
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(
          c.var.db,
          event.data.object as StripeSubscriptionObject,
        );
        break;
      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(
          c.env,
          c.var.db,
          event.data.object as StripeInvoiceObject,
        );
        break;
      case "invoice.payment_succeeded":
        await handleInvoicePaymentSucceeded(
          c.var.db,
          event.data.object as StripeInvoiceObject,
        );
        break;
      default:
        // Unknown event type, log and record so we don't re-process.
        console.log(`[stripe webhook] ignored event ${event.type} (${event.id})`);
    }
  } catch (err) {
    // Log and record the event as processed anyway, we'd rather lose
    // the one bad event than be retried 72 times. Operator will see the
    // error in worker logs and fix it manually.
    console.error(
      `[stripe webhook] handler threw for ${event.type} (${event.id}):`,
      err,
    );
  }

  // 5. Mark as processed so retries short-circuit.
  await c.var.db
    .insert(stripeEvents)
    .values({
      id: event.id,
      type: event.type,
      processedAt: Date.now(),
    })
    .onConflictDoNothing({ target: stripeEvents.id });

  return c.json({ received: true });
});

// ----- Event handlers -----

async function handleCheckoutCompleted(
  env: Env,
  db: Db,
  session: StripeCheckoutSessionObject,
): Promise<void> {
  // Verify the HMAC on client_reference_id, the ONLY source of truth
  // for which user this Checkout belongs to. Never fall back to
  // customer_email lookup (see lib/stripe.ts for the reason).
  const userId = await verifyClientReferenceId(
    env,
    session.client_reference_id,
  );
  if (!userId) {
    throw new Error(
      `checkout.session.completed without valid client_reference_id (session=${session.id})`,
    );
  }

  // Verify the user still exists before writing any billing state.
  const u = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1)
    .then((rows) => rows[0] ?? null);
  if (!u) {
    throw new Error(
      `checkout.session.completed references unknown user ${userId}`,
    );
  }

  if (!session.subscription) {
    // One-time payment or subscription still being set up. Nothing to
    // do yet, the customer.subscription.created event will land next.
    return;
  }

  // Pull the full Subscription object so we can write every field.
  const sub = await fetchStripeSubscription(env, session.subscription);
  await upsertSubscriptionFromStripe(db, userId, sub);
  // No auditLog write, auditLog.appId is a FK to apps.id, and a
  // subscription event is user-scoped. The stripe_events table is the
  // durable audit trail for billing.
}

async function handleSubscriptionUpdated(
  db: Db,
  sub: StripeSubscriptionObject,
): Promise<void> {
  // Find the user by stripeSubscriptionId OR stripeCustomerId. If neither
  // matches, this event arrived before checkout.session.completed had a
  // chance to write the customer ID, skip, we'll pick it up on the next
  // update or on checkout.session.completed itself.
  const existing = await db
    .select({ userId: subscriptions.userId })
    .from(subscriptions)
    .where(eq(subscriptions.stripeSubscriptionId, sub.id))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!existing) {
    console.log(
      `[stripe webhook] subscription.updated for unknown sub ${sub.id}, waiting for checkout.session.completed`,
    );
    return;
  }

  await upsertSubscriptionFromStripe(db, existing.userId, sub);
}

async function handleSubscriptionDeleted(
  db: Db,
  sub: StripeSubscriptionObject,
): Promise<void> {
  const existing = await db
    .select({ userId: subscriptions.userId })
    .from(subscriptions)
    .where(eq(subscriptions.stripeSubscriptionId, sub.id))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!existing) {
    console.log(
      `[stripe webhook] subscription.deleted for unknown sub ${sub.id}`,
    );
    return;
  }

  await db
    .update(subscriptions)
    .set({
      status: "canceled",
      plan: "free",
      updatedAt: Date.now(),
    })
    .where(eq(subscriptions.userId, existing.userId));
}

async function handleInvoicePaymentFailed(
  env: Env,
  db: Db,
  invoice: StripeInvoiceObject,
): Promise<void> {
  if (!invoice.subscription) return;

  const existing = await db
    .select({
      userId: subscriptions.userId,
      userEmail: user.email,
    })
    .from(subscriptions)
    .innerJoin(user, eq(user.id, subscriptions.userId))
    .where(eq(subscriptions.stripeSubscriptionId, invoice.subscription))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!existing) return;

  await db
    .update(subscriptions)
    .set({
      status: "past_due",
      updatedAt: Date.now(),
    })
    .where(eq(subscriptions.userId, existing.userId));

  // Best-effort email notification. Don't let a Resend outage break the
  // webhook, we've already updated the subscription state, the user
  // will see "past_due" in the dashboard regardless.
  try {
    await sendEmail(env, {
      to: existing.userEmail,
      subject: "[edgepush] payment failed, your plan will be downgraded soon",
      text: [
        `Your most recent edgepush payment didn't go through.`,
        ``,
        `Stripe will retry the charge automatically over the next few days.`,
        `If it keeps failing, your plan will be downgraded to Free and your`,
        `apps will hit the free-tier quota.`,
        ``,
        `To fix now:`,
        `  1. Update your card in the edgepush dashboard`,
        `  2. Or email hello@edgepush.dev if you need help`,
        ``,
        `edgepush, open source push notifications`,
      ].join("\n"),
    });
  } catch (err) {
    console.error(
      `[stripe webhook] failed to email ${existing.userEmail} about payment failure:`,
      err,
    );
  }
}

async function handleInvoicePaymentSucceeded(
  db: Db,
  invoice: StripeInvoiceObject,
): Promise<void> {
  if (!invoice.subscription) return;

  const existing = await db
    .select({
      userId: subscriptions.userId,
      status: subscriptions.status,
    })
    .from(subscriptions)
    .where(eq(subscriptions.stripeSubscriptionId, invoice.subscription))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!existing) return;

  // Only flip state if we were in past_due, don't demote a freshly-
  // canceled subscription back to active on a trailing retry.
  if (existing.status !== "past_due") return;

  await db
    .update(subscriptions)
    .set({
      status: "active",
      updatedAt: Date.now(),
    })
    .where(eq(subscriptions.userId, existing.userId));
}
