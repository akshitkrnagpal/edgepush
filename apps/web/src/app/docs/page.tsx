import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Docs",
  description: "Get started with edgepush in minutes.",
};

export default function DocsPage() {
  return (
    <main className="flex-1">
      <nav className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <Link href="/" className="text-lg font-semibold">
          edgepush
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/sign-in" className="text-sm text-zinc-400 hover:text-zinc-200">
            Sign in
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-5xl font-semibold mb-4">Docs</h1>
        <p className="text-lg text-zinc-400 mb-12">
          Everything you need to send push notifications with edgepush.
        </p>

        <Section id="install" title="1. Install the SDK">
          <Code language="bash">{`pnpm add @edgepush/sdk
# or npm install @edgepush/sdk
# or bun add @edgepush/sdk`}</Code>
        </Section>

        <Section id="create-app" title="2. Create an app in the dashboard">
          <p className="mb-4">
            Sign up at{" "}
            <Link href="/sign-up" className="underline underline-offset-4">
              edgepush.dev
            </Link>
            , create an app with your package name (for example{" "}
            <code className="text-sm">io.akshit.myapp</code>), and generate an
            API key. Copy the key immediately - it&apos;s shown only once.
          </p>
        </Section>

        <Section id="upload-credentials" title="3. Upload APNs and FCM credentials">
          <p className="mb-4">
            Under your app&apos;s Credentials tab, upload your APNs .p8 key
            (Apple Developer portal -&gt; Keys) and your Firebase service
            account JSON (Firebase console -&gt; Project settings -&gt;
            Service accounts -&gt; Generate new private key).
          </p>
          <p className="mb-4">
            Both are encrypted with AES-GCM before being written to the
            database. The raw key material is never exposed back to you or
            to anyone else via the API.
          </p>
        </Section>

        <Section id="send" title="4. Send your first push">
          <Code language="typescript">{`import { Edgepush } from "@edgepush/sdk";

const client = new Edgepush({
  apiKey: "io.akshit.myapp|abc123...",
});

const ticket = await client.send({
  to: deviceToken,  // APNs hex token or FCM registration token
  title: "Hello",
  body: "From edgepush",
  data: { url: "myapp://home" },
});

console.log(ticket.id); // save this to poll the receipt later`}</Code>
        </Section>

        <Section id="receipts" title="5. Check delivery status">
          <p className="mb-4">
            After you send, poll the receipt to see whether APNs or FCM
            accepted the message:
          </p>
          <Code language="typescript">{`const receipt = await client.getReceipt(ticket.id);

if (receipt.status === "delivered") {
  console.log("sent!");
} else if (receipt.status === "failed") {
  console.log("failed:", receipt.error);
  if (receipt.tokenInvalid) {
    // Remove the token from your database
  }
}`}</Code>
        </Section>

        <Section id="batch" title="Batch sends">
          <p className="mb-4">
            Send up to 100 messages in a single call. Dispatched through a
            Cloudflare Queue with automatic retries.
          </p>
          <Code language="typescript">{`const tickets = await client.sendBatch([
  { to: token1, title: "Hi Alice" },
  { to: token2, title: "Hi Bob" },
]);

const receipts = await client.getReceipts(tickets.map((t) => t.id));`}</Code>
        </Section>

        <Section id="api" title="REST API">
          <p className="mb-4">
            The SDK wraps a simple REST API. You can call it directly from
            any language. All endpoints require{" "}
            <code className="text-sm">Authorization: Bearer &lt;api_key&gt;</code>.
          </p>
          <Code language="bash">{`# Send
curl -X POST https://api.edgepush.dev/v1/send \\
  -H "Authorization: Bearer io.akshit.myapp|abc..." \\
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
  -H "Authorization: Bearer io.akshit.myapp|abc..."`}</Code>
        </Section>

        <Section id="self-host" title="Self-hosting">
          <p className="mb-4">
            edgepush is MIT licensed and runs entirely on Cloudflare. Clone
            the repo and deploy with Wrangler:
          </p>
          <Code language="bash">{`git clone https://github.com/akshitkrnagpal/edgepush.git
cd edgepush
pnpm install

# Create D1 database, KV namespace, Queue
cd apps/api
wrangler d1 create edgepush
wrangler kv namespace create CACHE
wrangler queues create edgepush-dispatch

# Update the IDs in wrangler.jsonc, then:
wrangler d1 migrations apply edgepush --remote
wrangler secret put ENCRYPTION_KEY
wrangler secret put BETTER_AUTH_SECRET
wrangler deploy`}</Code>
        </Section>
      </div>
    </main>
  );
}

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mb-12">
      <h2 className="text-2xl font-semibold mb-4">{title}</h2>
      <div className="text-zinc-300 leading-relaxed">{children}</div>
    </section>
  );
}

function Code({
  language,
  children,
}: {
  language: string;
  children: string;
}) {
  return (
    <pre className="bg-black/50 border border-white/5 rounded-xl p-5 overflow-x-auto text-sm leading-relaxed">
      <code className="font-mono text-zinc-300">{children}</code>
    </pre>
  );
}
