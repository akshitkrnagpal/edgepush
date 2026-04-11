/**
 * D1 schema for edgepush.
 *
 * Tables:
 * - user, session, account, verification: Better Auth tables
 * - apps: tenant apps (owned by users), each has a package name
 * - api_keys: API keys for apps (format: <packageName>|<secret>)
 * - apns_credentials: encrypted APNs .p8 + key id + team id
 * - fcm_credentials: encrypted FCM service account JSON
 * - messages: tickets for each push send
 * - receipts: delivery status, updated after dispatch
 */

import { sql } from "drizzle-orm";
import {
  integer,
  sqliteTable,
  text,
  uniqueIndex,
  index,
} from "drizzle-orm/sqlite-core";

// ----- Better Auth tables -----

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .notNull()
    .default(false),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", {
    mode: "timestamp",
  }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", {
    mode: "timestamp",
  }),
  scope: text("scope"),
  idToken: text("id_token"),
  password: text("password"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
});

// ----- edgepush tables -----

export const apps = sqliteTable(
  "apps",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    packageName: text("package_name").notNull(),
    createdAt: integer("created_at", { mode: "number" }).notNull(),
  },
  (table) => ({
    byUser: index("apps_by_user").on(table.userId),
    byPackageName: index("apps_by_package").on(table.packageName),
  }),
);

export const apiKeys = sqliteTable(
  "api_keys",
  {
    id: text("id").primaryKey(),
    appId: text("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    /** SHA-256 hash of the full apiKey string. We never store the raw key. */
    keyHash: text("key_hash").notNull().unique(),
    /** First 8 chars of the secret, for display in the dashboard. */
    preview: text("preview").notNull(),
    label: text("label").notNull(),
    createdAt: integer("created_at", { mode: "number" }).notNull(),
    lastUsedAt: integer("last_used_at", { mode: "number" }),
    revokedAt: integer("revoked_at", { mode: "number" }),
  },
  (table) => ({
    byApp: index("api_keys_by_app").on(table.appId),
  }),
);

export const apnsCredentials = sqliteTable("apns_credentials", {
  appId: text("app_id")
    .primaryKey()
    .references(() => apps.id, { onDelete: "cascade" }),
  keyId: text("key_id").notNull(),
  teamId: text("team_id").notNull(),
  /**
   * @deprecated Read bundleId from apps.packageName via join instead.
   * This column is no longer the source of truth, the dashboard PUT
   * handler writes `app.packageName` into it to satisfy the legacy
   * NOT NULL constraint, and `loadApnsCredentials` in dispatch.ts
   * ignores it entirely. The column will be physically dropped in a
   * follow-up migration after the hosted tier has been verified stable
   * with the normalized read path.
   */
  bundleId: text("bundle_id").notNull(),
  /** Encrypted .p8 key (AES-GCM ciphertext, base64). */
  privateKeyCiphertext: text("private_key_ciphertext").notNull(),
  /** Nonce used to encrypt the private key, base64. */
  privateKeyNonce: text("private_key_nonce").notNull(),
  production: integer("production", { mode: "boolean" })
    .notNull()
    .default(true),
  updatedAt: integer("updated_at", { mode: "number" }).notNull(),
  // Credential health probe state (populated by the scheduled probe cron).
  lastCheckedAt: integer("last_checked_at", { mode: "number" }),
  lastCheckOk: integer("last_check_ok", { mode: "boolean" }),
  lastCheckError: text("last_check_error"),
  alertSentAt: integer("alert_sent_at", { mode: "number" }),
});

export const fcmCredentials = sqliteTable("fcm_credentials", {
  appId: text("app_id")
    .primaryKey()
    .references(() => apps.id, { onDelete: "cascade" }),
  projectId: text("project_id").notNull(),
  /** Encrypted service account JSON. */
  serviceAccountCiphertext: text("service_account_ciphertext").notNull(),
  /** Nonce used to encrypt the JSON. */
  serviceAccountNonce: text("service_account_nonce").notNull(),
  updatedAt: integer("updated_at", { mode: "number" }).notNull(),
  // Credential health probe state (populated by the scheduled probe cron).
  lastCheckedAt: integer("last_checked_at", { mode: "number" }),
  lastCheckOk: integer("last_check_ok", { mode: "boolean" }),
  lastCheckError: text("last_check_error"),
  alertSentAt: integer("alert_sent_at", { mode: "number" }),
});

export const messages = sqliteTable(
  "messages",
  {
    id: text("id").primaryKey(),
    appId: text("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    to: text("to").notNull(),
    platform: text("platform", { enum: ["ios", "android"] }).notNull(),
    title: text("title"),
    body: text("body"),
    /** Full payload JSON sent to APNs/FCM, for debugging. */
    payloadJson: text("payload_json").notNull(),
    status: text("status", {
      enum: ["queued", "sending", "delivered", "failed", "expired"],
    })
      .notNull()
      .default("queued"),
    error: text("error"),
    tokenInvalid: integer("token_invalid", { mode: "boolean" })
      .notNull()
      .default(false),
    createdAt: integer("created_at", { mode: "number" }).notNull(),
    updatedAt: integer("updated_at", { mode: "number" }).notNull(),
  },
  (table) => ({
    byApp: index("messages_by_app").on(table.appId),
    byAppStatus: index("messages_by_app_status").on(table.appId, table.status),
    // Used by the "Recent deliveries" list with time-window pagination.
    byAppCreated: index("messages_by_app_created").on(
      table.appId,
      table.createdAt,
    ),
    // Used by the same list when filtered by status. Column order matters:
    // leftmost-prefix matching requires (appId, status, createdAt).
    byAppStatusCreated: index("messages_by_app_status_created").on(
      table.appId,
      table.status,
      table.createdAt,
    ),
  }),
);

/**
 * Webhook configuration per app. When a message status changes to
 * delivered, failed, or expired, edgepush POSTs the receipt to the
 * configured webhook URL with an HMAC signature header.
 */
export const webhooks = sqliteTable("webhooks", {
  appId: text("app_id")
    .primaryKey()
    .references(() => apps.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  /** HMAC secret used to sign outbound webhook bodies. */
  secret: text("secret").notNull(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
  updatedAt: integer("updated_at", { mode: "number" }).notNull(),
});

/**
 * Activity log for credential changes, API key creation/revocation, and
 * webhook updates. One row per sensitive action.
 */
export const auditLog = sqliteTable(
  "audit_log",
  {
    id: text("id").primaryKey(),
    appId: text("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    action: text("action", {
      enum: [
        "app.created",
        "app.deleted",
        "api_key.created",
        "api_key.revoked",
        "apns.updated",
        "apns.deleted",
        "fcm.updated",
        "fcm.deleted",
        "webhook.updated",
        "webhook.deleted",
        "subscription.upgraded",
        "subscription.updated",
        "subscription.canceled",
        "account.deleted",
      ],
    }).notNull(),
    /** Optional additional context, JSON-encoded. */
    metadata: text("metadata"),
    createdAt: integer("created_at", { mode: "number" }).notNull(),
  },
  (table) => ({
    byApp: index("audit_log_by_app").on(table.appId, table.createdAt),
  }),
);

// ----- Billing and usage (hosted tier) -----

/**
 * Per-user subscription state. One row per user, created with plan='free'
 * when the user signs up. Only enforced when HOSTED_MODE is true.
 */
export const subscriptions = sqliteTable("subscriptions", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  plan: text("plan", { enum: ["free", "pro", "enterprise", "selfhost"] })
    .notNull()
    .default("free"),
  status: text("status", {
    enum: ["active", "past_due", "canceled"],
  })
    .notNull()
    .default("active"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  currentPeriodStart: integer("current_period_start", { mode: "number" }),
  currentPeriodEnd: integer("current_period_end", { mode: "number" }),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
  updatedAt: integer("updated_at", { mode: "number" }).notNull(),
});

/**
 * Monthly send counter per user, for quota enforcement on /v1/send.
 * Primary key (userId, yearMonth) gives us an atomic
 * UPDATE ... WHERE events < limit RETURNING events
 * so quota checks are race-safe without a transaction.
 */
export const usageCounters = sqliteTable(
  "usage_counters",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** YYYY-MM string, e.g. "2026-04". Rolls over implicitly on month change. */
    yearMonth: text("year_month").notNull(),
    events: integer("events").notNull().default(0),
    updatedAt: integer("updated_at", { mode: "number" }).notNull(),
  },
  (table) => ({
    pk: uniqueIndex("usage_counters_pk").on(table.userId, table.yearMonth),
  }),
);

/**
 * Stripe webhook idempotency log. Stripe delivers webhooks at-least-once;
 * we dedup on event.id before applying any state change.
 */
export const stripeEvents = sqliteTable("stripe_events", {
  /** Stripe event.id, e.g. "evt_1NXXXXX". */
  id: text("id").primaryKey(),
  /** Event type, e.g. "checkout.session.completed", for debugging. */
  type: text("type").notNull(),
  processedAt: integer("processed_at", { mode: "number" }).notNull(),
});

/**
 * Operator-visible error log. Dispatch failures and DLQ drops write here;
 * the daily operator-digest cron reads and emails the operator.
 */
export const workerErrors = sqliteTable(
  "worker_errors",
  {
    id: text("id").primaryKey(),
    /** e.g. "dispatch", "dlq", "probe_apns", "probe_fcm", "cron". */
    kind: text("kind").notNull(),
    /** JSON-encoded context (appId, messageId, error message, etc.). */
    payload: text("payload"),
    resolved: integer("resolved", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "number" }).notNull(),
  },
  (table) => ({
    byCreated: index("worker_errors_by_created").on(table.createdAt),
    byKindCreated: index("worker_errors_by_kind_created").on(
      table.kind,
      table.createdAt,
    ),
  }),
);
