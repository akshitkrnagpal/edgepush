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
