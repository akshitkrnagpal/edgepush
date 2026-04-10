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
  bundleId: text("bundle_id").notNull(),
  /** Encrypted .p8 key (AES-GCM ciphertext, base64). */
  privateKeyCiphertext: text("private_key_ciphertext").notNull(),
  /** Nonce used to encrypt the private key, base64. */
  privateKeyNonce: text("private_key_nonce").notNull(),
  production: integer("production", { mode: "boolean" })
    .notNull()
    .default(true),
  updatedAt: integer("updated_at", { mode: "number" }).notNull(),
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
  }),
);
