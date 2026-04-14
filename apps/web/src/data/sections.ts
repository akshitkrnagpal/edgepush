/**
 * Ordered list of docs sections. Single source of truth for the
 * sidebar, the section index, generateStaticParams, and per-section
 * SEO metadata.
 */

export interface DocSection {
  slug: string;
  label: string;
  n: string;
  description: string;
}

export const SECTIONS: DocSection[] = [
  { slug: "install", label: "install", n: "01", description: "Install the @edgepush/sdk npm package for Node, Bun, Deno, or any fetch-capable runtime." },
  { slug: "create-app", label: "create app", n: "02", description: "Create an app in the edgepush dashboard and generate an API key for sending push notifications." },
  { slug: "credentials", label: "credentials", n: "03", description: "Upload your APNs .p8 key and FCM service account JSON. Both are encrypted with AES-GCM before storage." },
  { slug: "ios", label: "ios client", n: "04", description: "Get a native APNs device token from a Swift iOS app. Covers permission request, token format, and sandbox vs production." },
  { slug: "android", label: "android client", n: "05", description: "Get an FCM registration token from a Kotlin Android app. Covers FirebaseMessagingService, onNewToken, and project ID matching." },
  { slug: "react-native", label: "react native", n: "06", description: "Set up push tokens in React Native with @react-native-firebase or Expo. Includes the getDevicePushTokenAsync vs getExpoPushTokenAsync migration guide." },
  { slug: "send", label: "send", n: "07", description: "Send your first push notification with the edgepush SDK. One API call for both iOS and Android." },
  { slug: "rich", label: "rich notifications", n: "08", description: "Rich images, collapse-id, fine-grained APNs push types (voip, location), and absolute expiration timestamps." },
  { slug: "topics", label: "fcm topics", n: "09", description: "Send to FCM topics and conditions. Broadcast to all subscribers of a topic or a boolean combination of topics." },
  { slug: "receipts", label: "receipts", n: "10", description: "Poll delivery receipts to check whether APNs or FCM accepted the message. Handle tokenInvalid for cleanup." },
  { slug: "webhooks", label: "webhooks", n: "11", description: "Receive HMAC-signed webhook POSTs for delivery events. Includes signature verification code in Node.js." },
  { slug: "errors", label: "error codes", n: "12", description: "Full reference of APNs and FCM error codes with tokenInvalid flags and recommended actions for each." },
  { slug: "rate-limits", label: "rate limits", n: "13", description: "Per-app burst rate limit, monthly event quota on the hosted tier, and the operator kill switch." },
  { slug: "auth", label: "api keys", n: "14", description: "API key format, creating and revoking keys, zero-downtime rotation, and environment variable storage." },
  { slug: "batch", label: "batch", n: "15", description: "Send up to 100 messages in a single API call. Dispatched through Cloudflare Queues with automatic retries." },
  { slug: "cli", label: "cli", n: "16", description: "Install and use the @edgepush/cli terminal client. Login, send, receipt, and the full flag surface." },
  { slug: "api", label: "rest api", n: "17", description: "Call the edgepush REST API directly with curl or any HTTP client. POST /v1/send and GET /v1/receipts." },
  { slug: "self-host", label: "self-host", n: "18", description: "Run edgepush on your own Cloudflare account. Clone, create resources, set secrets, deploy in under 20 minutes." },
];
