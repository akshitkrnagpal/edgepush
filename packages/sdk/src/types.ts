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
  /** Time-sensitive flag (iOS). Breaks through Focus modes. */
  timeSensitive?: boolean;
  /** Content-available flag for silent background updates. */
  contentAvailable?: boolean;
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
