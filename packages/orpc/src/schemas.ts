import { z } from "zod";

/**
 * Push notification message. Callers POST these to /v1/send.
 * Maps cleanly to both APNs and FCM payloads.
 */
export const PushMessageSchema = z.object({
  /**
   * Platform-native device token. APNs hex string or FCM registration
   * token. Required for single-device sends. Omit when using `topic`
   * or `condition` (FCM-only broadcast).
   */
  to: z.string().min(1).optional(),
  /**
   * FCM topic name (without the "/topics/" prefix). Sends to all devices
   * subscribed to this topic. Mutually exclusive with `to` and `condition`.
   * APNs does not support server-side topics.
   */
  topic: z.string().min(1).max(256).optional(),
  /**
   * FCM condition expression for targeting multiple topics. Example:
   * `"'TopicA' in topics && ('TopicB' in topics || 'TopicC' in topics)"`.
   * Mutually exclusive with `to` and `topic`. APNs does not support this.
   */
  condition: z.string().min(1).max(1024).optional(),
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
   * Absolute Unix expiration timestamp in seconds. Takes precedence over
   * `ttl` if both are set. Use this when you already know the wall-clock
   * deadline (e.g., a meeting reminder that's worthless after 9:00 AM).
   */
  expirationAt: z.number().int().min(0).optional(),
  /**
   * Time-sensitive flag (iOS). Breaks through Focus modes.
   */
  timeSensitive: z.boolean().optional(),
  /**
   * Content-available flag for silent background updates.
   */
  contentAvailable: z.boolean().optional(),
  /**
   * iOS mutable-content flag. Set true if your Notification Service
   * Extension needs to modify the payload before display (the standard
   * pattern for downloading and attaching an `image`).
   */
  mutableContent: z.boolean().optional(),
  /**
   * Image URL for rich notifications. On iOS your Notification Service
   * Extension reads this from the custom data and downloads it; you must
   * also set `mutableContent: true`. On Android edgepush forwards it to
   * `android.notification.image` for native rendering.
   */
  image: z.string().url().optional(),
  /**
   * Collapse key. Identical collapse keys replace each other on the device
   * so the user only sees the latest one. Max 64 bytes (APNs limit).
   * Maps to `apns-collapse-id` on iOS and `android.collapse_key` on Android.
   */
  collapseId: z.string().max(64).optional(),
  /**
   * APNs push type override. Defaults to `alert` (or `background` when
   * `contentAvailable` is true). Set explicitly when sending VoIP, location,
   * complication, fileprovider, or MDM payloads, these require matching
   * topic suffixes and entitlements on your app side.
   */
  pushType: z
    .enum([
      "alert",
      "background",
      "voip",
      "location",
      "complication",
      "fileprovider",
      "mdm",
    ])
    .optional(),
}).refine(
  (msg) => {
    const targets = [msg.to, msg.topic, msg.condition].filter(Boolean);
    return targets.length === 1;
  },
  {
    message:
      "exactly one of `to`, `topic`, or `condition` must be set (they are mutually exclusive)",
  },
);

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
/**
 * Delivery receipt status returned from GET /v1/receipts/:id.
 */
export type ReceiptStatus =
  | "queued"
  | "sending"
  | "delivered"
  | "failed"
  | "expired";

export interface Receipt {
  id: string;
  status: ReceiptStatus;
  /** Underlying error code from APNs/FCM if the send failed. */
  error?: string;
  /** Whether the device token should be considered invalid. */
  tokenInvalid?: boolean;
  /** Unix timestamp (ms) when the message was first accepted. */
  createdAt: number;
  /** Unix timestamp (ms) when the status last changed. */
  updatedAt: number;
}
/**
 * An "app" is a tenant's application identity. Each app has:
 * - a bundle id (package name) used as the APNs topic / FCM identifier
 * - an API key used by the app's backend to call edgepush
 * - APNs credentials (.p8 key + key id + team id)
 * - FCM credentials (service account JSON)
 *
 * API keys are formatted as `<package_name>|<random_secret>` so they
 * self-identify in logs without needing a separate lookup.
 */

export interface App {
  id: string;
  userId: string;
  /** Display name shown in the dashboard. */
  name: string;
  /** Bundle id / package name (e.g. io.akshit.relay or com.example.app). */
  packageName: string;
  createdAt: number;
}

export interface ApnsCredentials {
  keyId: string;
  teamId: string;
  /**
   * APNs topic header. Derived from the owning app's `packageName` at
   * credential-load time, no longer a separately-uploaded field. This type
   * is the *runtime* shape used by the dispatcher, not the wire shape of
   * the upload API (the upload API no longer accepts `bundleId`).
   */
  bundleId: string;
  /** .p8 key file content. Stored encrypted at rest. */
  privateKey: string;
  /** Whether to use the production APNs endpoint or sandbox. */
  production: boolean;
}

export interface FcmCredentials {
  projectId: string;
  /** Firebase service account JSON. Stored encrypted at rest. */
  serviceAccountJson: string;
}

export function splitApiKey(
  apiKey: string,
): { packageName: string; secret: string } | null {
  const idx = apiKey.indexOf("|");
  if (idx <= 0) return null;
  const packageName = apiKey.slice(0, idx);
  const secret = apiKey.slice(idx + 1);
  if (!packageName || !secret) return null;
  return { packageName, secret };
}
