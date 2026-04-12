import type { Db } from "../db";
import { auditLog } from "../db/schema";
import { generateId } from "./crypto";

export type AuditAction =
  | "app.created"
  | "app.deleted"
  | "app.rate_limit_updated"
  | "api_key.created"
  | "api_key.revoked"
  | "apns.updated"
  | "apns.deleted"
  | "fcm.updated"
  | "fcm.deleted"
  | "webhook.updated"
  | "webhook.deleted";

export async function logAudit(
  db: Db,
  params: {
    appId: string;
    userId: string;
    action: AuditAction;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  await db.insert(auditLog).values({
    id: generateId(),
    appId: params.appId,
    userId: params.userId,
    action: params.action,
    metadata: params.metadata ? JSON.stringify(params.metadata) : null,
    createdAt: Date.now(),
  });
}
