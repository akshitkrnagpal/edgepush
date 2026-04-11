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
  { id: "send", label: "send" },
  { id: "receipts", label: "receipts" },
  { id: "batch", label: "batch" },
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
              generate an API key. Copy the key immediately — it&apos;s shown
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

          <Section id="send" n="04" title="send your first push">
            <Code>{`import { Edgepush } from "@edgepush/sdk";

const client = new Edgepush({
  apiKey: "io.acme.myapp|abc123...",
});

const ticket = await client.send({
  to: deviceToken,  // APNs hex token or FCM registration token
  title: "Hello",
  body: "From edgepush",
  data: { url: "myapp://home" },
});

console.log(ticket.id); // save this to poll the receipt later`}</Code>
          </Section>

          <Section id="receipts" n="05" title="check delivery status">
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

          <Section id="batch" n="06" title="batch sends">
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

          <Section id="api" n="07" title="rest api">
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

          <Section id="self-host" n="08" title="self-host it">
            <p className="mb-4">
              edgepush is MIT licensed and runs entirely on Cloudflare. Clone
              the repo and deploy with Wrangler:
            </p>
            <Code>{`git clone https://github.com/akshitkrnagpal/edgepush.git
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
