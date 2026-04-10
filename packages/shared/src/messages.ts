import { z } from "zod";

/**
 * Push notification message. Callers POST these to /v1/send.
 * Maps cleanly to both APNs and FCM payloads.
 */
export const PushMessageSchema = z.object({
  /** Platform-native device token. APNs hex string or FCM registration token. */
  to: z.string().min(1),
  /** Platform hint. If omitted, edgepush will route based on token format. */
  platform: z.enum(["ios", "android"]).optional(),
  /** Notification title shown in the banner. */
  title: z.string().max(256).optional(),
  /** Notification body shown in the banner. */
  body: z.string().max(4000).optional(),
  /** Sound name or "default". */
  sound: z.string().optional(),
  /** Badge count for iOS. */
  badge: z.number().int().min(0).optional(),
  /** Custom data payload delivered with the notification. */
  data: z.record(z.string(), z.unknown()).optional(),
  /**
   * iOS category / Android channel for action buttons and grouping.
   */
  category: z.string().optional(),
  /**
   * Priority: "high" delivers immediately, "normal" can be delayed by the OS.
   */
  priority: z.enum(["high", "normal"]).default("high").optional(),
  /**
   * Time-to-live in seconds. If the device is offline longer than this,
   * the message is dropped.
   */
  ttl: z.number().int().min(0).max(2419200).optional(),
  /**
   * Time-sensitive flag (iOS). Breaks through Focus modes.
   */
  timeSensitive: z.boolean().optional(),
  /**
   * Content-available flag for silent background updates.
   */
  contentAvailable: z.boolean().optional(),
});

export type PushMessage = z.infer<typeof PushMessageSchema>;

/**
 * Batched send request. Up to 100 messages per call.
 */
export const SendRequestSchema = z.object({
  messages: z.array(PushMessageSchema).min(1).max(100),
});

export type SendRequest = z.infer<typeof SendRequestSchema>;

export interface SendResponseItem {
  /** Ticket ID to look up the delivery receipt later. */
  id: string;
  /** Immediate status: ok if accepted, error if rejected before send. */
  status: "ok" | "error";
  message?: string;
}

export interface SendResponse {
  data: SendResponseItem[];
}
