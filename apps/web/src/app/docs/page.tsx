import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Docs",
  description: "Get started with edgepush in minutes.",
};

const sections = [
  { id: "install", label: "install" },
  { id: "create-app", label: "create app" },
  { id: "upload-credentials", label: "credentials" },
  { id: "ios", label: "ios client" },
  { id: "android", label: "android client" },
  { id: "react-native", label: "react native" },
  { id: "send", label: "send" },
  { id: "rich", label: "rich notifications" },
  { id: "receipts", label: "receipts" },
  { id: "webhooks", label: "webhooks" },
  { id: "errors", label: "error codes" },
  { id: "rate-limits", label: "rate limits" },
  { id: "auth", label: "api keys" },
  { id: "batch", label: "batch" },
  { id: "cli", label: "cli" },
  { id: "api", label: "rest api" },
  { id: "self-host", label: "self-host" },
];

export default function DocsPage() {
  return (
    <main className="flex-1 font-sans">
      <nav className="mx-auto flex max-w-[1440px] items-center justify-between border-b border-rule px-6 py-5">
        <Link
          href="/"
          className="flex items-center gap-2.5 font-mono text-[15px] font-bold text-text"
        >
          <span className="relative flex h-[22px] w-[22px] items-center justify-center border border-accent font-mono text-[11px] font-extrabold text-accent">
            ep
          </span>
          edgepush
        </Link>
        <div className="flex items-center gap-3 font-mono text-[12px] uppercase tracking-[0.1em]">
          <Link
            href="/sign-in"
            className="rounded-none border border-rule-strong px-4 py-2 font-semibold text-text hover:border-text"
          >
            sign_in
          </Link>
        </div>
      </nav>

      <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-10 px-6 py-16 lg:grid-cols-[200px_1fr]">
        {/* Side nav */}
        <aside className="lg:sticky lg:top-10 lg:self-start">
          <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
            <span className="text-accent">─&nbsp;</span> contents
          </div>
          <ul className="flex flex-col gap-1 font-mono text-[12px]">
            {sections.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="block py-1 text-muted-strong hover:text-text"
                >
                  <span className="text-rule-strong">│&nbsp;</span>
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </aside>

        <div>
          <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
            <span className="text-accent">$&nbsp;</span> man edgepush
          </div>
          <h1 className="mb-4 font-mono text-[56px] font-extrabold leading-[0.95] tracking-[-0.035em] text-text">
            docs.
          </h1>
          <p className="mb-14 max-w-xl font-sans text-[17px] leading-[1.55] text-muted-strong">
            Everything you need to send push notifications with edgepush. Five
            minutes from API key to first ticket.
          </p>

          <Section id="install" n="01" title="install the sdk">
            <Code>{`pnpm add @edgepush/sdk
# or npm install @edgepush/sdk
# or bun add @edgepush/sdk`}</Code>
          </Section>

          <Section id="create-app" n="02" title="create an app in the dashboard">
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
          </Section>

          <Section id="upload-credentials" n="03" title="upload apns + fcm credentials">
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
          </Section>

          <Section id="ios" n="04" title="get a device token from iOS">
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
            <p className="mt-4 mb-2 font-mono text-[12px] uppercase tracking-[0.12em] text-muted">
              <span className="text-accent">─&nbsp;</span> notes
            </p>
            <ul className="list-none space-y-2 font-sans text-[14px] leading-[1.6] text-muted-strong">
              <li>
                <span className="text-accent">●</span> The token is the same
                between development and production builds, but only{" "}
                <span className="font-mono text-text">api.push.apple.com</span>{" "}
                (production) or{" "}
                <span className="font-mono text-text">
                  api.sandbox.push.apple.com
                </span>{" "}
                (sandbox) will accept it depending on which provisioning
                profile your app was built with. Mark the credential in the
                edgepush dashboard as production or sandbox accordingly.
              </li>
              <li>
                <span className="text-accent">●</span> The token can change
                when the user reinstalls the app, restores from backup, or
                migrates to a new device. Send fresh tokens to your server
                whenever{" "}
                <span className="font-mono text-text">
                  didRegisterForRemoteNotifications…
                </span>{" "}
                fires.
              </li>
              <li>
                <span className="text-accent">●</span> Don&apos;t use Expo&apos;s{" "}
                <span className="font-mono text-text">ExponentPushToken</span>{" "}
                format with edgepush. edgepush wants the native APNs token
                directly. See the React Native section below for the migration.
              </li>
            </ul>
          </Section>

          <Section id="android" n="05" title="get a device token from android">
            <p className="mb-4">
              You need a Firebase project with Cloud Messaging enabled and
              your{" "}
              <span className="font-mono text-text">google-services.json</span>{" "}
              file in your app&apos;s{" "}
              <span className="font-mono text-text">app/</span> directory. The
              same Firebase project must own the service account JSON you
              uploaded to edgepush.
            </p>
            <p className="mb-4">
              Request the initial token after sign-in, then implement{" "}
              <span className="font-mono text-text">onNewToken</span> in a
              FirebaseMessagingService subclass to catch refreshes:
            </p>
            <Code>{`// MyMessagingService.kt
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

class MyMessagingService : FirebaseMessagingService() {

  override fun onNewToken(token: String) {
    // Fires whenever the FCM token rotates: install, app data
    // clear, restore, periodic FCM rotation. Send to your server
    // immediately so you stop pushing to a dead token.
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
            <p className="mt-4 mb-2 font-mono text-[12px] uppercase tracking-[0.12em] text-muted">
              <span className="text-accent">─&nbsp;</span> notes
            </p>
            <ul className="list-none space-y-2 font-sans text-[14px] leading-[1.6] text-muted-strong">
              <li>
                <span className="text-accent">●</span> The token is a long
                opaque string (over 150 characters), much longer than an
                APNs hex token. edgepush auto-detects format on{" "}
                <span className="font-mono text-text">/v1/send</span> if you
                don&apos;t pass a{" "}
                <span className="font-mono text-text">platform</span> field,
                but you can set it explicitly.
              </li>
              <li>
                <span className="text-accent">●</span> The Firebase project
                ID in your client&apos;s{" "}
                <span className="font-mono text-text">google-services.json</span>{" "}
                must match the{" "}
                <span className="font-mono text-text">project_id</span>{" "}
                inside the FCM service account JSON you uploaded to edgepush.
                Different projects = silent delivery failures.
              </li>
              <li>
                <span className="text-accent">●</span> If your app supports
                multiple flavors (e.g. dev / staging / prod) point each
                flavor at its own Firebase project AND its own edgepush app.
                Don&apos;t cross-wire credentials.
              </li>
            </ul>
          </Section>

          <Section id="react-native" n="06" title="react native: bare or expo">
            <p className="mb-4">
              React Native gives you three paths. Pick the one matching your
              project shape, and if you&apos;re an Expo user, read the
              callout below carefully because there&apos;s exactly one trap
              you need to avoid.
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

  // FCM token (works for both iOS and Android with this library;
  // on iOS it returns the FCM-wrapped APNs token).
  const fcmToken = await messaging().getToken();
  await sendTokenToServer({ platform: "fcm", token: fcmToken });

  // For Apple, if you want the raw APNs token instead, use:
  //   const apns = await messaging().getAPNSToken();
  // …and upload your .p8 to edgepush as the iOS credential.

  messaging().onTokenRefresh((newToken) => {
    sendTokenToServer({ platform: "fcm", token: newToken });
  });
}`}</Code>

            <h3 className="mt-8 mb-2 font-mono text-[14px] font-bold text-text">
              Expo (managed or bare) with expo-notifications
            </h3>
            <p className="mb-3">
              Use{" "}
              <span className="font-mono text-text">
                getDevicePushTokenAsync
              </span>{" "}
              to get the native APNs or FCM token. This is the migration
              point from Expo&apos;s Push Service to edgepush, see the
              callout below.
            </p>
            <Code>{`import * as Notifications from "expo-notifications";

export async function setupPush() {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== "granted") return;

  // ✅ DEVICE token = native APNs hex / FCM token (use this with edgepush)
  // ❌ EXPO token = "ExponentPushToken[…]" (only Expo's Push Service)
  const token = await Notifications.getDevicePushTokenAsync();
  // token.type:  "ios" | "android"
  // token.data:  the native token string

  await fetch("https://your.api/register-token", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      platform: token.type,
      token: token.data,
    }),
  });

  Notifications.addPushTokenListener((next) => {
    // Token rotated; resend
  });
}`}</Code>

            <div className="mt-6 border border-accent bg-surface px-5 py-4 font-sans text-[14px] leading-[1.6] text-muted-strong">
              <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.12em] text-accent">
                ●&nbsp; the one expo trap
              </p>
              <p className="mb-2">
                Most Expo Notifications tutorials lead with{" "}
                <span className="font-mono text-text">
                  getExpoPushTokenAsync()
                </span>
                . That returns an{" "}
                <span className="font-mono text-text">
                  ExponentPushToken[xxx]
                </span>{" "}
                wrapper that <em>only</em> Expo&apos;s Push Service understands.
                It is not a native APNs or FCM token.
              </p>
              <p>
                edgepush wants the real one. Always use{" "}
                <span className="font-mono text-text">
                  getDevicePushTokenAsync()
                </span>{" "}
                instead. That&apos;s the entire client-side migration step
                from Expo Push to edgepush, change one function name. The
                server side is already handled because{" "}
                <span className="font-mono text-text">
                  getDevicePushTokenAsync
                </span>{" "}
                returns the same token format APNs and FCM use natively.
              </p>
            </div>
          </Section>

          <Section id="send" n="07" title="send your first push">
            <Code>{`import { Edgepush } from "@edgepush/sdk";

const client = new Edgepush({
  apiKey: "com.acme.myapp|sk_abc123...",
});

const ticket = await client.send({
  to: deviceToken,  // native APNs or FCM token, no Expo wrapper
  title: "Hello",
  body: "From edgepush",
  data: { url: "myapp://home" },
});

console.log(ticket.id); // save this to poll the receipt later`}</Code>
            <p className="mt-4">
              Every field maps directly to the underlying APNs or FCM
              payload. There&apos;s no proprietary token format and no
              abstracted-away headers, see <a href="#rich">rich notifications</a>{" "}
              for the full surface.
            </p>
          </Section>

          <Section id="rich" n="08" title="rich notifications, collapse, expiration">
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

  // rich notification image. on iOS your Notification Service
  // Extension reads this from the custom data block and downloads
  // it; on Android it goes to android.notification.image natively.
  image: "https://cdn.acme.app/o/4271.jpg",
  mutableContent: true,  // required for the iOS NSE pattern

  // collapse-id: identical keys replace each other on the device
  // so the user only ever sees the latest one. max 64 bytes.
  // maps to apns-collapse-id and android.collapse_key.
  collapseId: "order-4271",

  // absolute expiration timestamp. takes precedence over ttl.
  // use this when you know the wall-clock deadline (e.g. a
  // 10-minute reminder that's worthless after the meeting starts).
  expirationAt: Math.floor(Date.now() / 1000) + 600,

  // explicit apns push type. defaults to "alert" (or "background"
  // when contentAvailable is true). set this for voip / location /
  // complication / fileprovider / mdm payloads.
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
          </Section>

          <Section id="receipts" n="09" title="check delivery status">
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
          </Section>

          <Section id="webhooks" n="10" title="webhooks">
            <p className="mb-4">
              Configure a webhook URL on your app and edgepush will POST
              every state change to your endpoint with an HMAC-SHA256
              signature over the raw body. No polling required.
            </p>
            <Code>{`POST /your/webhook  HTTP/1.1
x-edgepush-event:     message.delivered
x-edgepush-signature: sha256=9f86d081…
x-edgepush-id:        evt_01HX2A9P4M
content-type:         application/json

{
  "event": "message.delivered",
  "messageId": "tk_01HX2A9P4M",
  "appId": "app_…",
  "status": "delivered",
  "error": null,
  "tokenInvalid": false,
  "timestamp": 1744386512000
}`}</Code>
            <p className="mt-4 mb-3">
              Verify the signature in your handler:
            </p>
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
          </Section>

          <Section id="errors" n="11" title="error codes">
            <p className="mb-4">
              When a push fails, the receipt&apos;s{" "}
              <span className="font-mono text-text">error</span> field
              contains the reason code from APNs or FCM. The{" "}
              <span className="font-mono text-text">tokenInvalid</span>{" "}
              boolean flags tokens you should remove from your database.
            </p>
            <h3 className="mt-6 mb-3 font-mono text-[14px] font-bold text-text">
              APNs error codes
            </h3>
            <div className="overflow-x-auto border border-rule-strong bg-surface">
              <table className="w-full font-mono text-[12px]">
                <thead>
                  <tr className="border-b border-rule-strong bg-surface-2 text-left text-[10px] uppercase tracking-[0.12em] text-muted">
                    <th className="px-4 py-2 font-medium">reason</th>
                    <th className="px-4 py-2 font-medium">tokenInvalid</th>
                    <th className="px-4 py-2 font-medium">action</th>
                  </tr>
                </thead>
                <tbody className="text-muted-strong">
                  <ErrorRow reason="BadDeviceToken" invalid="true" action="Remove the token. The device unregistered or the token is malformed." />
                  <ErrorRow reason="Unregistered" invalid="true" action="Remove the token. The device was wiped or the app was uninstalled." />
                  <ErrorRow reason="DeviceTokenNotForTopic" invalid="true" action="Remove the token. It belongs to a different app (bundle ID mismatch)." />
                  <ErrorRow reason="PayloadTooLarge" invalid="false" action="Reduce your payload size (4096 byte APNs limit)." />
                  <ErrorRow reason="TooManyRequests" invalid="false" action="Back off. Apple is rate-limiting your sends to this device." />
                  <ErrorRow reason="InternalServerError" invalid="false" action="Retry. Transient APNs failure." />
                  <ErrorRow reason="ServiceUnavailable" invalid="false" action="Retry. APNs is temporarily down." />
                  <ErrorRow reason="ExpiredProviderToken" invalid="false" action="Your .p8 key may be revoked. Check the credential health panel." />
                  <ErrorRow reason="InvalidProviderToken" invalid="false" action="Team ID, key ID, or .p8 key is wrong. Re-upload the credential." />
                  <ErrorRow reason="TopicDisallowed" invalid="false" action="The bundle ID isn't authorized for push. Check your Apple Developer portal." />
                </tbody>
              </table>
            </div>
            <h3 className="mt-6 mb-3 font-mono text-[14px] font-bold text-text">
              FCM error codes
            </h3>
            <div className="overflow-x-auto border border-rule-strong bg-surface">
              <table className="w-full font-mono text-[12px]">
                <thead>
                  <tr className="border-b border-rule-strong bg-surface-2 text-left text-[10px] uppercase tracking-[0.12em] text-muted">
                    <th className="px-4 py-2 font-medium">status</th>
                    <th className="px-4 py-2 font-medium">tokenInvalid</th>
                    <th className="px-4 py-2 font-medium">action</th>
                  </tr>
                </thead>
                <tbody className="text-muted-strong">
                  <ErrorRow reason="NOT_FOUND" invalid="true" action="Remove the token. The registration no longer exists." />
                  <ErrorRow reason="UNREGISTERED" invalid="true" action="Remove the token. The app was uninstalled." />
                  <ErrorRow reason="INVALID_ARGUMENT" invalid="true" action="The token is malformed. Remove it." />
                  <ErrorRow reason="PERMISSION_DENIED" invalid="false" action="The service account lost cloud messaging permissions. Re-check IAM." />
                  <ErrorRow reason="UNAVAILABLE" invalid="false" action="Retry. FCM is temporarily overloaded." />
                  <ErrorRow reason="INTERNAL" invalid="false" action="Retry. Transient FCM failure." />
                  <ErrorRow reason="QUOTA_EXCEEDED" invalid="false" action="Back off. You hit FCM's per-project rate limit." />
                  <ErrorRow reason="SENDER_ID_MISMATCH" invalid="false" action="The token was registered under a different Firebase project." />
                </tbody>
              </table>
            </div>
          </Section>

          <Section id="rate-limits" n="12" title="rate limits + quotas">
            <p className="mb-4">
              Two limits gate{" "}
              <span className="font-mono text-text">POST /v1/send</span>:
              a per-app burst rate limit and (on the hosted tier) a monthly
              event quota. Rate-limited requests do NOT consume quota.
            </p>
            <h3 className="mt-6 mb-3 font-mono text-[14px] font-bold text-text">
              Per-app rate limit
            </h3>
            <p className="mb-4">
              Token-bucket via a Durable Object, scoped to each app.
              Default: 1000 events/minute burst capacity. When exceeded,
              the API returns:
            </p>
            <Code>{`HTTP 429
{
  "error": "rate_limited",
  "retry_after_ms": 1200
}`}</Code>
            <p className="mt-4">
              Wait <span className="font-mono text-text">retry_after_ms</span>{" "}
              and resend. The bucket refills continuously, no manual reset
              needed. Self-hosters can tune the limit by editing{" "}
              <span className="font-mono text-text">
                DEFAULT_CAPACITY
              </span>{" "}
              in <span className="font-mono text-text">apps/api/src/rate-limiter.ts</span>.
            </p>

            <h3 className="mt-6 mb-3 font-mono text-[14px] font-bold text-text">
              Monthly event quota (hosted tier only)
            </h3>
            <p className="mb-4">
              Free: 10,000 events/month. Pro: 50,000 events/month.
              Self-host (<span className="font-mono text-text">HOSTED_MODE=false</span>):
              unlimited. When exceeded:
            </p>
            <Code>{`HTTP 429
{
  "error": "quota_exceeded",
  "plan": "free",
  "limit": 10000,
  "used": 10000,
  "year_month": "2026-04",
  "detail": "monthly send limit for plan \\"free\\" is 10000 events..."
}

Headers:
  x-ratelimit-limit: 10000
  x-ratelimit-used:  10000
  x-ratelimit-scope: monthly`}</Code>
            <p className="mt-4">
              The counter resets on the first day of each calendar month.
              Upgrade to Pro on{" "}
              <a
                href="/pricing"
                className="text-text underline decoration-accent underline-offset-4 hover:text-accent"
              >
                /pricing
              </a>{" "}
              to raise the cap.
            </p>

            <h3 className="mt-6 mb-3 font-mono text-[14px] font-bold text-text">
              Kill switch (503)
            </h3>
            <p className="mb-4">
              If the operator enables the kill switch,{" "}
              <span className="font-mono text-text">/v1/send</span> returns{" "}
              <span className="font-mono text-text">503 maintenance</span>{" "}
              with a <span className="font-mono text-text">Retry-After: 60</span>{" "}
              header before touching auth or the DB. This is an operator-level
              safety valve, not something you need to handle in normal
              operation.
            </p>
          </Section>

          <Section id="auth" n="13" title="api keys">
            <p className="mb-4">
              Every <span className="font-mono text-text">/v1/send</span>{" "}
              and <span className="font-mono text-text">/v1/receipts</span>{" "}
              request requires a Bearer token in the{" "}
              <span className="font-mono text-text">Authorization</span>{" "}
              header:
            </p>
            <Code>{`Authorization: Bearer com.acme.myapp|sk_abc123def456...`}</Code>

            <h3 className="mt-6 mb-3 font-mono text-[14px] font-bold text-text">
              Key format
            </h3>
            <p className="mb-4">
              <span className="font-mono text-text">&lt;package_name&gt;|&lt;secret&gt;</span>.
              The package name prefix is the app&apos;s bundle/package ID
              (what you entered when creating the app). The secret is a
              random string generated by the server. Keys self-identify in
              logs so you can tell which app a request belongs to.
            </p>

            <h3 className="mt-6 mb-3 font-mono text-[14px] font-bold text-text">
              Creating and revoking
            </h3>
            <p className="mb-4">
              Create keys in the dashboard under your app&apos;s API Keys
              section. The full key is shown exactly once at creation time.
              Copy it immediately. You can create multiple keys per app
              (e.g., one for your production server, one for CI).
            </p>
            <p className="mb-4">
              To revoke a key, click the revoke button in the dashboard. The
              key stops working immediately. There is no grace period or
              overlap window. If you need zero-downtime rotation, create a
              new key first, update your server to use it, then revoke the
              old one.
            </p>

            <h3 className="mt-6 mb-3 font-mono text-[14px] font-bold text-text">
              Environment variables
            </h3>
            <p>
              Store your key in an environment variable, never in source code:
            </p>
            <Code>{`# .env (never commit this file)
EDGEPUSH_API_KEY=com.acme.myapp|sk_abc123def456...

# your server
const client = new Edgepush({
  apiKey: process.env.EDGEPUSH_API_KEY,
});`}</Code>
            <p className="mt-4">
              The CLI reads from <span className="font-mono text-text">EDGEPUSH_API_KEY</span>{" "}
              and <span className="font-mono text-text">EDGEPUSH_BASE_URL</span>{" "}
              environment variables as overrides. See{" "}
              <a
                href="#cli"
                className="text-text underline decoration-accent underline-offset-4 hover:text-accent"
              >
                the CLI section
              </a>{" "}
              for details.
            </p>
          </Section>

          <Section id="batch" n="14" title="batch sends">
            <p className="mb-4">
              Send up to 100 messages in a single call. Dispatched through a
              Cloudflare Queue with automatic retries.
            </p>
            <Code>{`const tickets = await client.sendBatch([
  { to: token1, title: "Hi Alice" },
  { to: token2, title: "Hi Bob" },
]);

const receipts = await client.getReceipts(tickets.map((t) => t.id));`}</Code>
          </Section>

          <Section id="cli" n="15" title="cli">
            <p className="mb-4">
              <span className="font-mono text-text">@edgepush/cli</span> is
              a terminal client for sending pushes from your laptop or a
              CI script. Install globally and authenticate once.
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
          </Section>

          <Section id="api" n="16" title="rest api">
            <p className="mb-4">
              The SDK wraps a simple REST API. You can call it directly from
              any language. All endpoints require{" "}
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
          </Section>

          <Section id="self-host" n="17" title="self-host it">
            <p className="mb-4">
              edgepush server + dashboard are{" "}
              <span className="font-mono text-text">AGPL-3.0</span>. The SDK,
              CLI, and shared types are{" "}
              <span className="font-mono text-text">MIT</span> so you can
              embed them in a closed-source app without copyleft obligations.
              Run the whole stack on your own Cloudflare account:
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
              nightly D1 backup workflow. If you plan to run a paid tier
              with Stripe billing, also read{" "}
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
          </Section>
        </div>
      </div>
    </main>
  );
}

function Section({
  id,
  n,
  title,
  children,
}: {
  id: string;
  n: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mb-16 scroll-mt-10">
      <div className="mb-4 flex items-baseline gap-3 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
        <span>
          <span className="text-accent">├&nbsp;</span>
          {n}
        </span>
      </div>
      <h2 className="mb-5 font-mono text-[26px] font-bold leading-[1.05] tracking-[-0.02em] text-text">
        {title}
      </h2>
      <div className="font-sans text-[15px] leading-[1.65] text-muted-strong">
        {children}
      </div>
    </section>
  );
}

function Code({ children }: { children: string }) {
  return (
    <pre className="mt-4 overflow-x-auto border border-rule-strong bg-surface p-5 font-mono text-[13px] leading-[1.6] text-text">
      <code>{children}</code>
    </pre>
  );
}

function ErrorRow({
  reason,
  invalid,
  action,
}: {
  reason: string;
  invalid: string;
  action: string;
}) {
  return (
    <tr className="border-b border-rule last:border-b-0">
      <td className="px-4 py-2 text-text">{reason}</td>
      <td
        className={`px-4 py-2 ${
          invalid === "true" ? "text-error" : "text-muted"
        }`}
      >
        {invalid}
      </td>
      <td className="px-4 py-2">{action}</td>
    </tr>
  );
}
