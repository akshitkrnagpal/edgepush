import type { Db } from "./db";

export interface Env {
  DB: D1Database;
  CACHE: KVNamespace;
  DISPATCH_QUEUE: Queue<DispatchJob>;
  WEBHOOK_QUEUE: Queue<WebhookJob>;
  RATE_LIMITER: DurableObjectNamespace;

  BETTER_AUTH_URL: string;
  BETTER_AUTH_SECRET: string;
  ENCRYPTION_KEY: string;
  DASHBOARD_URL?: string;

  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;

  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  /**
   * Destination for the daily operator digest email. Optional -
   * if unset, the digest cron logs to console.warn and skips sending.
   */
  OPERATOR_EMAIL?: string;

  /**
   * Hosted vs self-host mode gate. Set to "true" on edgepush.dev.
   * Self-hosters leave it unset or "false".
   *
   * When "true": plan/quota/retention checks are enforced.
   * When "false": all gates bypass, unlimited apps/events/retention.
   *
   * Read via isHosted(env) from lib/mode.ts, never compare the string directly.
   */
  HOSTED_MODE?: string;

  // Stripe billing (hosted tier only). All optional, self-host leaves
  // them unset and the billing endpoints return 501 gracefully.
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  /** HMAC key used to sign client_reference_id in Checkout sessions. */
  STRIPE_REF_HMAC_KEY?: string;
  /** Stripe Price ID for the Pro tier ($29/mo). */
  STRIPE_PRO_PRICE_ID?: string;

  /**
   * Operator-only token gating the deep health endpoint
   * (`GET /health/deep`). When unset, the endpoint is disabled (503).
   * When set, requests must include a matching
   * `x-edgepush-operator-token` header.
   *
   * Set with: `pnpm wrangler secret put OPERATOR_PROBE_TOKEN`.
   */
  OPERATOR_PROBE_TOKEN?: string;
}

export interface AppContext {
  Bindings: Env;
  Variables: {
    db: Db;
  };
}

export interface DispatchJob {
  messageId: string;
  appId: string;
}

export interface WebhookJob {
  url: string;
  secret: string;
  payload: {
    event: string;
    messageId: string;
    appId: string;
    status: string;
    error?: string | null;
    tokenInvalid?: boolean;
    timestamp: number;
  };
  attempt: number;
}
