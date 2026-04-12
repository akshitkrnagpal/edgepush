/**
 * Dynamic docs route. Each slug (install, ios, errors, etc.) renders
 * its own content with prev/next navigation. All 17 sections are
 * statically pre-rendered at build time via generateStaticParams.
 *
 * Content lives in this one file as a Record<slug, JSX.Element>.
 * That's ~900 lines, which is large for a single component, but
 * the alternative (17 separate page files) is more files to maintain
 * for identical structural boilerplate. When this grows past ~1500
 * lines, split by theme (getting-started, client, sending, reference).
 */

import Link from "next/link";
import type { Metadata } from "next";

import { SECTIONS } from "../sections";
import { Section, Code, ErrorRow, PrevNext } from "../components";

// Static params so Next.js pre-renders every docs page at build time.
export function generateStaticParams() {
  return SECTIONS.map((s) => ({ slug: s.slug }));
}

export function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Metadata {
  const section = SECTIONS.find((s) => s.slug === params.slug);
  return {
    title: section ? `${section.label} | edgepush docs` : "edgepush docs",
  };
}

export default function DocSectionPage({
  params,
}: {
  params: { slug: string };
}) {
  const idx = SECTIONS.findIndex((s) => s.slug === params.slug);
  const section = SECTIONS[idx];
  if (!section) {
    return (
      <div className="font-mono text-[14px] text-muted">
        <span className="text-accent">●</span> section not found:{" "}
        <span className="text-text">{params.slug}</span>
      </div>
    );
  }

  const prev = idx > 0 ? SECTIONS[idx - 1] : undefined;
  const next = idx < SECTIONS.length - 1 ? SECTIONS[idx + 1] : undefined;

  const Content = CONTENT[section.slug];
  return (
    <>
      <Section n={section.n} title={section.label}>
        {Content ? <Content /> : null}
      </Section>
      <PrevNext
        prev={prev ? { slug: prev.slug, label: prev.label } : undefined}
        next={next ? { slug: next.slug, label: next.label } : undefined}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Section content. Each function returns the JSX that goes inside the
// <Section> wrapper (which provides the number badge and h2 title).
// ---------------------------------------------------------------------------

const CONTENT: Record<string, React.FC> = {
  install: InstallContent,
  "create-app": CreateAppContent,
  credentials: CredentialsContent,
  ios: IosContent,
  android: AndroidContent,
  "react-native": ReactNativeContent,
  send: SendContent,
  rich: RichContent,
  topics: TopicsContent,
  receipts: ReceiptsContent,
  webhooks: WebhooksContent,
  errors: ErrorsContent,
  "rate-limits": RateLimitsContent,
  auth: AuthContent,
  batch: BatchContent,
  cli: CliContent,
  api: ApiContent,
  "self-host": SelfHostContent,
};

// -- 01 install --
function InstallContent() {
  return (
    <Code>{`pnpm add @edgepush/sdk
# or npm install @edgepush/sdk
# or bun add @edgepush/sdk`}</Code>
  );
}

// -- 02 create-app --
function CreateAppContent() {
  return (
    <p>
      Sign in at{" "}
      <Link
        href="/sign-in"
        className="text-text underline decoration-accent underline-offset-4 hover:text-accent"
      >
        edgepush.dev
      </Link>
      , create an app with your package name (for example{" "}
      <span className="font-mono text-text">io.acme.myapp</span>), and
      generate an API key. Copy the key immediately, it&apos;s shown
      only once.
    </p>
  );
}

// -- 03 credentials --
function CredentialsContent() {
  return (
    <>
      <p className="mb-4">
        Under your app&apos;s Credentials tab, upload your APNs .p8 key
        (Apple Developer portal → Keys) and your Firebase service account
        JSON (Firebase console → Project settings → Service accounts →
        Generate new private key).
      </p>
      <p>
        Both are encrypted with AES-GCM before being written to D1. The
        raw key material is never exposed back to you or to anyone else
        via the API.
      </p>
    </>
  );
}

// -- 04 ios --
function IosContent() {
  return (
    <>
      <p className="mb-4">
        In your Swift app, ask the user for permission, register with
        APNs, then convert the returned <span className="font-mono text-text">Data</span>{" "}
        into the lowercase hex string edgepush expects.
      </p>
      <Code>{`// AppDelegate.swift
import UIKit
import UserNotifications

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    UNUserNotificationCenter.current().requestAuthorization(
      options: [.alert, .sound, .badge]
    ) { granted, _ in
      guard granted else { return }
      DispatchQueue.main.async {
        application.registerForRemoteNotifications()
      }
    }
    return true
  }

  func application(
    _ application: UIApplication,
    didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
  ) {
    // edgepush expects 64 lowercase hex characters
    let token = deviceToken.map { String(format: "%02x", $0) }.joined()
    Task { await registerToken(token) }
  }

  func application(
    _ application: UIApplication,
    didFailToRegisterForRemoteNotificationsWithError error: Error
  ) {
    print("APNs registration failed:", error)
  }
}`}</Code>
      <Notes
        items={[
          "The token is the same between development and production builds, but only api.push.apple.com (production) or api.sandbox.push.apple.com (sandbox) will accept it depending on which provisioning profile your app was built with. Mark the credential in the edgepush dashboard as production or sandbox accordingly.",
          "The token can change when the user reinstalls the app, restores from backup, or migrates to a new device. Send fresh tokens to your server whenever didRegisterForRemoteNotifications fires.",
          "Don't use Expo's ExponentPushToken format with edgepush. edgepush wants the native APNs token directly. See the React Native section for the migration.",
        ]}
      />
    </>
  );
}

// -- 05 android --
function AndroidContent() {
  return (
    <>
      <p className="mb-4">
        You need a Firebase project with Cloud Messaging enabled and
        your{" "}
        <span className="font-mono text-text">google-services.json</span>{" "}
        file in your app&apos;s{" "}
        <span className="font-mono text-text">app/</span> directory. The
        same Firebase project must own the service account JSON you
        uploaded to edgepush.
      </p>
      <Code>{`// MyMessagingService.kt
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

class MyMessagingService : FirebaseMessagingService() {

  override fun onNewToken(token: String) {
    sendTokenToServer(token)
  }

  override fun onMessageReceived(message: RemoteMessage) {
    // Optional: handle pushes received while the app is foregrounded.
  }
}`}</Code>
      <p className="mt-4 mb-2">
        Register the service in{" "}
        <span className="font-mono text-text">AndroidManifest.xml</span>:
      </p>
      <Code>{`<service
  android:name=".MyMessagingService"
  android:exported="false">
  <intent-filter>
    <action android:name="com.google.firebase.MESSAGING_EVENT" />
  </intent-filter>
</service>`}</Code>
      <p className="mt-4 mb-2">Fetch the initial token after sign-in:</p>
      <Code>{`import com.google.firebase.messaging.FirebaseMessaging
import kotlinx.coroutines.tasks.await

suspend fun fetchInitialFcmToken(): String? {
  return try {
    FirebaseMessaging.getInstance().token.await()
  } catch (e: Exception) {
    null  // Google Play Services unavailable, etc.
  }
}`}</Code>
      <Notes
        items={[
          "The token is a long opaque string (over 150 characters), much longer than an APNs hex token. edgepush auto-detects format on /v1/send if you don't pass a platform field, but you can set it explicitly.",
          "The Firebase project ID in your client's google-services.json must match the project_id inside the FCM service account JSON you uploaded to edgepush. Different projects = silent delivery failures.",
          "If your app supports multiple flavors (e.g. dev / staging / prod) point each flavor at its own Firebase project AND its own edgepush app. Don't cross-wire credentials.",
        ]}
      />
    </>
  );
}

// -- 06 react-native --
function ReactNativeContent() {
  return (
    <>
      <p className="mb-4">
        React Native gives you three paths. Pick the one matching your
        project shape, and if you&apos;re an Expo user, read the callout
        below carefully because there&apos;s exactly one trap you need to
        avoid.
      </p>
      <h3 className="mt-6 mb-2 font-mono text-[14px] font-bold text-text">
        Bare RN with @react-native-firebase/messaging
      </h3>
      <Code>{`import messaging from "@react-native-firebase/messaging";

export async function setupPush() {
  const status = await messaging().requestPermission();
  if (
    status === messaging.AuthorizationStatus.DENIED ||
    status === messaging.AuthorizationStatus.NOT_DETERMINED
  ) return;

  const fcmToken = await messaging().getToken();
  await sendTokenToServer({ platform: "fcm", token: fcmToken });

  messaging().onTokenRefresh((newToken) => {
    sendTokenToServer({ platform: "fcm", token: newToken });
  });
}`}</Code>
      <h3 className="mt-8 mb-2 font-mono text-[14px] font-bold text-text">
        Expo (managed or bare) with expo-notifications
      </h3>
      <Code>{`import * as Notifications from "expo-notifications";

export async function setupPush() {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== "granted") return;

  // DEVICE token = native APNs hex / FCM token (use this with edgepush)
  // EXPO token = "ExponentPushToken[...]" (only Expo's Push Service)
  const token = await Notifications.getDevicePushTokenAsync();

  await fetch("https://your.api/register-token", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      platform: token.type,
      token: token.data,
    }),
  });
}`}</Code>
      <div className="mt-6 border border-accent bg-surface px-5 py-4 font-sans text-[14px] leading-[1.6] text-muted-strong">
        <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.12em] text-accent">
          ●&nbsp; the one expo trap
        </p>
        <p className="mb-2">
          Most Expo Notifications tutorials lead with{" "}
          <span className="font-mono text-text">getExpoPushTokenAsync()</span>.
          That returns an{" "}
          <span className="font-mono text-text">ExponentPushToken[xxx]</span>{" "}
          wrapper that <em>only</em> Expo&apos;s Push Service understands.
          It is not a native APNs or FCM token.
        </p>
        <p>
          edgepush wants the real one. Always use{" "}
          <span className="font-mono text-text">getDevicePushTokenAsync()</span>{" "}
          instead. That&apos;s the entire client-side migration step from
          Expo Push to edgepush, change one function name.
        </p>
      </div>
    </>
  );
}

// -- 07 send --
function SendContent() {
  return (
    <>
      <Code>{`import { Edgepush } from "@edgepush/sdk";

const client = new Edgepush({
  apiKey: "com.acme.myapp|sk_abc123...",
});

const ticket = await client.send({
  to: deviceToken,  // native APNs or FCM token
  title: "Hello",
  body: "From edgepush",
  data: { url: "myapp://home" },
});

console.log(ticket.id); // save this to poll the receipt later`}</Code>
      <p className="mt-4">
        Every field maps directly to the underlying APNs or FCM payload.
        There&apos;s no proprietary token format and no abstracted-away
        headers, see <Link href="/docs/rich" className="text-text underline decoration-accent underline-offset-4 hover:text-accent">rich notifications</Link>{" "}
        for the full surface.
      </p>
    </>
  );
}

// -- 08 rich --
function RichContent() {
  return (
    <>
      <p className="mb-4">
        edgepush forwards the full APNs and FCM header surface so you
        can ship features Expo Push Service can&apos;t. The fields below
        are all optional and additive, the basic{" "}
        <span className="font-mono text-text">{"{ to, title, body }"}</span>{" "}
        still works.
      </p>
      <Code>{`await client.send({
  to: deviceToken,
  title: "New order #4271",
  body: "2x flat white, table 3",

  // rich notification image
  image: "https://cdn.acme.app/o/4271.jpg",
  mutableContent: true,  // required for the iOS NSE pattern

  // collapse-id: identical keys replace each other on the device
  collapseId: "order-4271",

  // absolute expiration timestamp
  expirationAt: Math.floor(Date.now() / 1000) + 600,

  // explicit apns push type (default: "alert")
  pushType: "alert",
});`}</Code>
      <p className="mt-4">
        For iOS rich notifications you also need a Notification Service
        Extension target in your app. Apple&apos;s{" "}
        <a
          href="https://developer.apple.com/documentation/usernotifications/modifying-content-in-newly-delivered-notifications"
          target="_blank"
          rel="noopener noreferrer"
          className="text-text underline decoration-accent underline-offset-4 hover:text-accent"
        >
          Modifying content in newly delivered notifications
        </a>{" "}
        walks through the NSE setup.
      </p>
    </>
  );
}

// -- 09 topics --
function TopicsContent() {
  return (
    <>
      <p className="mb-4">
        FCM supports server-side topic broadcasting. Instead of sending to a
        specific device token, you can send to all devices subscribed to a
        topic. edgepush passes the topic or condition straight through to
        the FCM HTTP v1 API.
      </p>
      <h3 className="mt-6 mb-3 font-mono text-[14px] font-bold text-text">
        Topic send
      </h3>
      <p className="mb-3">
        Devices subscribe to topics client-side via the Firebase SDK.
        Your server sends to the topic name (no &quot;/topics/&quot; prefix):
      </p>
      <Code>{`// all devices subscribed to "breaking-news" get this
await client.send({
  topic: "breaking-news",
  title: "Earthquake in Tokyo",
  body: "Magnitude 6.2, no tsunami warning",
});`}</Code>
      <h3 className="mt-6 mb-3 font-mono text-[14px] font-bold text-text">
        Condition send
      </h3>
      <p className="mb-3">
        Target devices subscribed to a boolean combination of topics:
      </p>
      <Code>{`// devices subscribed to "sports" AND ("news" OR "breaking")
await client.send({
  condition: "'sports' in topics && ('news' in topics || 'breaking' in topics)",
  title: "Match started",
  body: "Team A vs Team B, kickoff now",
});`}</Code>
      <Notes
        items={[
          "Topic and condition sends are FCM-only. APNs does not have server-side topic broadcasting.",
          "Exactly one of to, topic, or condition must be set per message. The API rejects requests with more than one.",
          "A topic send consumes 1 event from your monthly quota regardless of how many devices are subscribed. FCM fans out on their side.",
          "Devices subscribe to topics via FirebaseMessaging.getInstance().subscribeToTopic(\"news\") on Android or Messaging.messaging().subscribe(toTopic:) on iOS (through the Firebase SDK, not edgepush).",
          "The CLI supports --topic and --condition flags: edgepush send --topic news --title \"Hello\"",
        ]}
      />
    </>
  );
}

// -- 10 receipts --
function ReceiptsContent() {
  return (
    <>
      <p className="mb-4">
        After you send, poll the receipt to see whether APNs or FCM
        accepted the message:
      </p>
      <Code>{`const receipt = await client.getReceipt(ticket.id);

if (receipt.status === "delivered") {
  console.log("● delivered");
} else if (receipt.status === "failed") {
  console.log("● failed:", receipt.error);
  if (receipt.tokenInvalid) {
    // Remove the token from your database
  }
}`}</Code>
    </>
  );
}

// -- 10 webhooks --
function WebhooksContent() {
  return (
    <>
      <p className="mb-4">
        Configure a webhook URL on your app and edgepush will POST every
        state change to your endpoint with an HMAC-SHA256 signature over
        the raw body. No polling required.
      </p>
      <Code>{`POST /your/webhook  HTTP/1.1
x-edgepush-event:     message.delivered
x-edgepush-signature: sha256=9f86d081...
x-edgepush-id:        evt_01HX2A9P4M
content-type:         application/json

{
  "event": "message.delivered",
  "messageId": "tk_01HX2A9P4M",
  "appId": "app_...",
  "status": "delivered",
  "error": null,
  "tokenInvalid": false,
  "timestamp": 1744386512000
}`}</Code>
      <p className="mt-4 mb-3">Verify the signature in your handler:</p>
      <Code>{`import { createHmac, timingSafeEqual } from "node:crypto";

function verify(body: string, sigHeader: string, secret: string) {
  const expected = createHmac("sha256", secret)
    .update(body)
    .digest("base64");
  const provided = sigHeader.replace(/^sha256=/, "");
  return timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(provided),
  );
}`}</Code>
    </>
  );
}

// -- 11 errors --
function ErrorsContent() {
  return (
    <>
      <p className="mb-4">
        When a push fails, the receipt&apos;s{" "}
        <span className="font-mono text-text">error</span> field contains
        the reason code from APNs or FCM. The{" "}
        <span className="font-mono text-text">tokenInvalid</span> boolean
        flags tokens you should remove from your database.
      </p>
      <h3 className="mt-6 mb-3 font-mono text-[14px] font-bold text-text">
        APNs error codes
      </h3>
      <ErrorTable>
        <ErrorRow reason="BadDeviceToken" invalid="true" action="Remove the token. The device unregistered or the token is malformed." />
        <ErrorRow reason="Unregistered" invalid="true" action="Remove the token. The device was wiped or the app was uninstalled." />
        <ErrorRow reason="DeviceTokenNotForTopic" invalid="true" action="Remove the token. It belongs to a different app (bundle ID mismatch)." />
        <ErrorRow reason="PayloadTooLarge" invalid="false" action="Reduce your payload size (4096 byte APNs limit)." />
        <ErrorRow reason="TooManyRequests" invalid="false" action="Back off. Apple is rate-limiting your sends to this device." />
        <ErrorRow reason="InternalServerError" invalid="false" action="Retry. Transient APNs failure." />
        <ErrorRow reason="ServiceUnavailable" invalid="false" action="Retry. APNs is temporarily down." />
        <ErrorRow reason="ExpiredProviderToken" invalid="false" action="Your .p8 key may be revoked. Check the credential health panel." />
        <ErrorRow reason="InvalidProviderToken" invalid="false" action="Team ID, key ID, or .p8 key is wrong. Re-upload the credential." />
        <ErrorRow reason="TopicDisallowed" invalid="false" action="The bundle ID is not authorized for push. Check your Apple Developer portal." />
      </ErrorTable>
      <h3 className="mt-6 mb-3 font-mono text-[14px] font-bold text-text">
        FCM error codes
      </h3>
      <ErrorTable>
        <ErrorRow reason="NOT_FOUND" invalid="true" action="Remove the token. The registration no longer exists." />
        <ErrorRow reason="UNREGISTERED" invalid="true" action="Remove the token. The app was uninstalled." />
        <ErrorRow reason="INVALID_ARGUMENT" invalid="true" action="The token is malformed. Remove it." />
        <ErrorRow reason="PERMISSION_DENIED" invalid="false" action="The service account lost cloud messaging permissions. Re-check IAM." />
        <ErrorRow reason="UNAVAILABLE" invalid="false" action="Retry. FCM is temporarily overloaded." />
        <ErrorRow reason="INTERNAL" invalid="false" action="Retry. Transient FCM failure." />
        <ErrorRow reason="QUOTA_EXCEEDED" invalid="false" action="Back off. You hit FCM per-project rate limit." />
        <ErrorRow reason="SENDER_ID_MISMATCH" invalid="false" action="The token was registered under a different Firebase project." />
      </ErrorTable>
    </>
  );
}

// -- 12 rate-limits --
function RateLimitsContent() {
  return (
    <>
      <p className="mb-4">
        Two limits gate{" "}
        <span className="font-mono text-text">POST /v1/send</span>: a
        per-app burst rate limit and (on the hosted tier) a monthly event
        quota. Rate-limited requests do NOT consume quota.
      </p>
      <h3 className="mt-6 mb-3 font-mono text-[14px] font-bold text-text">
        Per-app rate limit
      </h3>
      <p className="mb-4">
        Token-bucket via a Durable Object, scoped to each app. Default:
        1000 events/minute burst capacity. When exceeded:
      </p>
      <Code>{`HTTP 429
{
  "error": "rate_limited",
  "retry_after_ms": 1200
}`}</Code>
      <p className="mt-4">
        Wait <span className="font-mono text-text">retry_after_ms</span>{" "}
        and resend. Self-hosters can tune the limit by editing{" "}
        <span className="font-mono text-text">DEFAULT_CAPACITY</span> in{" "}
        <span className="font-mono text-text">apps/api/src/rate-limiter.ts</span>.
      </p>
      <h3 className="mt-6 mb-3 font-mono text-[14px] font-bold text-text">
        Monthly event quota (hosted tier only)
      </h3>
      <p className="mb-4">
        Free: 10,000 events/month. Pro: 50,000 events/month. Self-host: unlimited.
      </p>
      <Code>{`HTTP 429
{
  "error": "quota_exceeded",
  "plan": "free",
  "limit": 10000,
  "used": 10000,
  "year_month": "2026-04",
  "detail": "monthly send limit..."
}

Headers:
  x-ratelimit-limit: 10000
  x-ratelimit-used:  10000
  x-ratelimit-scope: monthly`}</Code>
      <p className="mt-4">
        The counter resets on the first day of each calendar month.
        Upgrade to Pro on{" "}
        <Link href="/pricing" className="text-text underline decoration-accent underline-offset-4 hover:text-accent">
          /pricing
        </Link>{" "}
        to raise the cap.
      </p>
    </>
  );
}

// -- 13 auth --
function AuthContent() {
  return (
    <>
      <p className="mb-4">
        Every <span className="font-mono text-text">/v1/send</span> and{" "}
        <span className="font-mono text-text">/v1/receipts</span> request
        requires a Bearer token:
      </p>
      <Code>{`Authorization: Bearer com.acme.myapp|sk_abc123def456...`}</Code>
      <h3 className="mt-6 mb-3 font-mono text-[14px] font-bold text-text">
        Key format
      </h3>
      <p className="mb-4">
        <span className="font-mono text-text">&lt;package_name&gt;|&lt;secret&gt;</span>.
        The package name prefix is the app&apos;s bundle/package ID. The
        secret is a random string generated by the server. Keys
        self-identify in logs so you can tell which app a request belongs
        to.
      </p>
      <h3 className="mt-6 mb-3 font-mono text-[14px] font-bold text-text">
        Creating and revoking
      </h3>
      <p className="mb-4">
        Create keys in the dashboard under your app&apos;s API Keys
        section. The full key is shown exactly once at creation time.
        Copy it immediately. You can create multiple keys per app.
      </p>
      <p className="mb-4">
        To revoke a key, click the revoke button in the dashboard. The
        key stops working immediately. If you need zero-downtime
        rotation, create a new key first, update your server, then revoke
        the old one.
      </p>
      <h3 className="mt-6 mb-3 font-mono text-[14px] font-bold text-text">
        Environment variables
      </h3>
      <Code>{`# .env (never commit this file)
EDGEPUSH_API_KEY=com.acme.myapp|sk_abc123def456...

# your server
const client = new Edgepush({
  apiKey: process.env.EDGEPUSH_API_KEY,
});`}</Code>
      <p className="mt-4">
        The CLI reads from{" "}
        <span className="font-mono text-text">EDGEPUSH_API_KEY</span> and{" "}
        <span className="font-mono text-text">EDGEPUSH_BASE_URL</span>{" "}
        environment variables as overrides. See{" "}
        <Link href="/docs/cli" className="text-text underline decoration-accent underline-offset-4 hover:text-accent">
          the CLI section
        </Link>{" "}
        for details.
      </p>
    </>
  );
}

// -- 14 batch --
function BatchContent() {
  return (
    <>
      <p className="mb-4">
        Send up to 100 messages in a single call. Dispatched through a
        Cloudflare Queue with automatic retries.
      </p>
      <Code>{`const tickets = await client.sendBatch([
  { to: token1, title: "Hi Alice" },
  { to: token2, title: "Hi Bob" },
]);

const receipts = await client.getReceipts(tickets.map((t) => t.id));`}</Code>
    </>
  );
}

// -- 15 cli --
function CliContent() {
  return (
    <>
      <p className="mb-4">
        <span className="font-mono text-text">@edgepush/cli</span> is a
        terminal client for sending pushes from your laptop or a CI
        script. Install globally and authenticate once.
      </p>
      <Code>{`npm install -g @edgepush/cli
edgepush login              # paste an api key
edgepush whoami             # confirm the active key
edgepush send <token> --title "Hello" --body "From the CLI"
edgepush receipt <ticket_id>`}</Code>
      <p className="mt-4">
        The CLI exposes the full v0.2 surface as flags:{" "}
        <span className="font-mono text-text">--image</span>,{" "}
        <span className="font-mono text-text">--collapse-id</span>,{" "}
        <span className="font-mono text-text">--push-type</span>,{" "}
        <span className="font-mono text-text">--mutable-content</span>,{" "}
        <span className="font-mono text-text">--expiration-at</span>,{" "}
        <span className="font-mono text-text">--ttl</span>,{" "}
        <span className="font-mono text-text">--priority</span>. Run{" "}
        <span className="font-mono text-text">edgepush --help</span>{" "}
        for the full list. The SDK is bundled inline so the CLI is a
        single-package install.
      </p>
    </>
  );
}

// -- 16 api --
function ApiContent() {
  return (
    <>
      <p className="mb-4">
        The SDK wraps a simple REST API. You can call it directly from any
        language. All endpoints require{" "}
        <span className="font-mono text-text">
          Authorization: Bearer &lt;api_key&gt;
        </span>
        .
      </p>
      <Code>{`# Send
curl -X POST https://api.edgepush.dev/v1/send \\
  -H "Authorization: Bearer io.acme.myapp|abc..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "messages": [{
      "to": "DEVICE_TOKEN",
      "title": "Hello",
      "body": "World"
    }]
  }'

# Get a receipt
curl https://api.edgepush.dev/v1/receipts/TICKET_ID \\
  -H "Authorization: Bearer io.acme.myapp|abc..."`}</Code>
    </>
  );
}

// -- 17 self-host --
function SelfHostContent() {
  return (
    <>
      <p className="mb-4">
        edgepush server + dashboard are{" "}
        <span className="font-mono text-text">AGPL-3.0</span>. The SDK,
        CLI, and shared types are{" "}
        <span className="font-mono text-text">MIT</span> so you can embed
        them in a closed-source app without copyleft obligations. Run the
        whole stack on your own Cloudflare account:
      </p>
      <Code>{`git clone https://github.com/akshitkrnagpal/edgepush.git
cd edgepush
pnpm install

# Create D1 database, KV namespace, Queues
cd apps/api
pnpm wrangler d1 create edgepush
pnpm wrangler kv namespace create edgepush-cache
pnpm wrangler queues create edgepush-dispatch
pnpm wrangler queues create edgepush-dispatch-dlq

# Paste the IDs into wrangler.jsonc, then:
pnpm wrangler secret put ENCRYPTION_KEY
pnpm wrangler secret put BETTER_AUTH_SECRET
pnpm wrangler secret put GITHUB_CLIENT_ID
pnpm wrangler secret put GITHUB_CLIENT_SECRET

pnpm db:migrate:remote
pnpm deploy

# Then deploy the dashboard
cd ../web && pnpm deploy`}</Code>
      <p className="mt-4">
        Full guide:{" "}
        <a
          href="https://github.com/akshitkrnagpal/edgepush/blob/main/SELFHOST.md"
          target="_blank"
          rel="noopener noreferrer"
          className="text-text underline decoration-accent underline-offset-4 hover:text-accent"
        >
          SELFHOST.md
        </a>{" "}
        covers prerequisites, secrets, migrations, troubleshooting, and the
        nightly D1 backup workflow. If you plan to run a paid tier with
        Stripe billing, also read{" "}
        <a
          href="https://github.com/akshitkrnagpal/edgepush/blob/main/OPERATOR.md"
          target="_blank"
          rel="noopener noreferrer"
          className="text-text underline decoration-accent underline-offset-4 hover:text-accent"
        >
          OPERATOR.md
        </a>
        .
      </p>
    </>
  );
}

// ---------------------------------------------------------------------------
// Small helpers used by section content above
// ---------------------------------------------------------------------------

function Notes({ items }: { items: string[] }) {
  return (
    <div className="mt-4 mb-2">
      <p className="font-mono text-[12px] uppercase tracking-[0.12em] text-muted">
        <span className="text-accent">─&nbsp;</span> notes
      </p>
      <ul className="mt-2 list-none space-y-2 font-sans text-[14px] leading-[1.6] text-muted-strong">
        {items.map((item, i) => (
          <li key={i}>
            <span className="text-accent">●</span> {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ErrorTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto border border-rule-strong bg-surface">
      <table className="w-full font-mono text-[12px]">
        <thead>
          <tr className="border-b border-rule-strong bg-surface-2 text-left text-[10px] uppercase tracking-[0.12em] text-muted">
            <th className="px-4 py-2 font-medium">reason</th>
            <th className="px-4 py-2 font-medium">tokenInvalid</th>
            <th className="px-4 py-2 font-medium">action</th>
          </tr>
        </thead>
        <tbody className="text-muted-strong">{children}</tbody>
      </table>
    </div>
  );
}
