/**
 * Push notification message. Maps cleanly to both APNs and FCM payloads.
 */
export interface PushMessage {
  /** Platform-native device token. APNs hex string or FCM registration token. */
  to: string;
  /** Platform hint. If omitted, edgepush will route based on token format. */
  platform?: "ios" | "android";
  /** Notification title shown in the banner. */
  title?: string;
  /** Notification body shown in the banner. */
  body?: string;
  /** Sound name or "default". */
  sound?: string;
  /** Badge count for iOS. */
  badge?: number;
  /** Custom data payload delivered with the notification. */
  data?: Record<string, unknown>;
  /** iOS category / Android channel for action buttons and grouping. */
  category?: string;
  /** Priority: "high" delivers immediately, "normal" can be delayed by the OS. */
  priority?: "high" | "normal";
  /** Time-to-live in seconds. */
  ttl?: number;
  /**
   * Absolute Unix expiration timestamp in seconds. Takes precedence over
   * `ttl` if both are set. Use this when you already know the wall-clock
   * deadline.
   */
  expirationAt?: number;
  /** Time-sensitive flag (iOS). Breaks through Focus modes. */
  timeSensitive?: boolean;
  /** Content-available flag for silent background updates. */
  contentAvailable?: boolean;
  /**
   * iOS mutable-content flag. Set true when your Notification Service
   * Extension needs to mutate the payload before display (the standard
   * pattern for downloading and attaching an `image`).
   */
  mutableContent?: boolean;
  /**
   * Image URL for rich notifications. On iOS your Notification Service
   * Extension reads this from the custom data and downloads it; you must
   * also set `mutableContent: true`. On Android it's forwarded to
   * `android.notification.image` for native rendering.
   */
  image?: string;
  /**
   * Collapse key. Identical collapse keys replace each other on the device
   * so the user only sees the latest one. Max 64 bytes. Maps to
   * `apns-collapse-id` on iOS and `android.collapse_key` on Android.
   */
  collapseId?: string;
  /**
   * APNs push type override. Defaults to `alert` (or `background` when
   * `contentAvailable` is true). Set explicitly when sending VoIP,
   * location, complication, fileprovider, or MDM payloads — these
   * require matching topic suffixes and entitlements on your app side.
   */
  pushType?:
    | "alert"
    | "background"
    | "voip"
    | "location"
    | "complication"
    | "fileprovider"
    | "mdm";
}

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
  createdAt: number;
  updatedAt: number;
}

export interface Ticket {
  /** Use this id with getReceipt() to poll delivery status. */
  id: string;
  status: "ok" | "error";
  message?: string;
}

export interface EdgepushOptions {
  /**
   * Your API key in the format `<package_name>|<secret>`.
   * Get one from the edgepush dashboard.
   */
  apiKey: string;
  /**
   * Base URL of the edgepush API. Defaults to the hosted service.
   */
  baseURL?: string;
  /**
   * Custom fetch implementation. Defaults to the global `fetch`.
   * Useful for testing or running in environments without fetch.
   */
  fetch?: typeof fetch;
}

export class EdgepushError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "EdgepushError";
  }
}
