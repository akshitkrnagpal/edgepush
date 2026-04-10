import Link from "next/link";

export default function Home() {
  return (
    <main className="flex-1">
      <nav className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Logo />
          <span className="text-lg font-semibold">edgepush</span>
        </Link>
        <div className="flex items-center gap-5 text-sm">
          <Link href="/docs" className="text-zinc-400 hover:text-zinc-200">
            Docs
          </Link>
          <a
            href="https://github.com/akshitkrnagpal/edgepush"
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-400 hover:text-zinc-200"
          >
            GitHub
          </a>
          <Link
            href="/sign-in"
            className="rounded-full bg-white text-black px-4 py-1.5 font-medium hover:bg-zinc-200"
          >
            Sign in
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-24">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-1.5 text-xs text-zinc-400 mb-8">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          Open source alpha, free forever
        </div>
        <h1 className="text-5xl sm:text-7xl font-semibold tracking-tight max-w-4xl leading-[1.03]">
          Push notifications{" "}
          <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            at the edge.
          </span>
        </h1>
        <p className="mt-6 text-lg sm:text-xl text-zinc-400 max-w-2xl leading-relaxed">
          Open source alternative to Expo Push Notification Service. Send
          native iOS and Android pushes through a single API, running on
          Cloudflare Workers.
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-3">
          <Link
            href="/sign-in"
            className="inline-flex items-center gap-2 rounded-full bg-white text-black px-6 py-3 text-sm font-medium hover:bg-zinc-200"
          >
            Sign in with GitHub
          </Link>
          <Link
            href="/docs"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 px-6 py-3 text-sm font-medium hover:bg-white/5"
          >
            Read the docs
          </Link>
        </div>
      </section>

      {/* Code preview */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-[1.1fr_1fr] gap-0 md:gap-6 items-start">
          <div className="rounded-xl border border-white/10 bg-black/40 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 text-xs text-zinc-500">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500/60" />
                <span className="w-3 h-3 rounded-full bg-yellow-500/60" />
                <span className="w-3 h-3 rounded-full bg-green-500/60" />
              </div>
              <span className="font-mono">server.ts</span>
            </div>
            <pre className="p-5 text-sm leading-relaxed overflow-x-auto">
              <code className="font-mono text-zinc-300">{`import { Edgepush } from "@edgepush/sdk";

const client = new Edgepush({
  apiKey: process.env.EDGEPUSH_KEY, // io.akshit.app|...
});

await client.send({
  to: userDeviceToken,
  title: "New order",
  body: "Your coffee is ready ☕",
  data: { orderId: "abc123" },
});`}</code>
            </pre>
          </div>
          <div className="px-2 md:px-0 mt-8 md:mt-16 space-y-5">
            <div>
              <div className="text-xs tracking-widest uppercase text-emerald-400 mb-2">
                One API
              </div>
              <p className="text-lg font-semibold">
                No more separate APNs and FCM integrations.
              </p>
              <p className="text-sm text-zinc-400 mt-1">
                edgepush abstracts the differences and dispatches to the
                right platform.
              </p>
            </div>
            <div>
              <div className="text-xs tracking-widest uppercase text-cyan-400 mb-2">
                Zero vendor lock-in
              </div>
              <p className="text-lg font-semibold">
                Use native tokens, bring your own credentials.
              </p>
              <p className="text-sm text-zinc-400 mt-1">
                Your APNs .p8 keys and FCM JSONs stay encrypted in D1.
                Revoke anytime.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-5xl mx-auto px-6 py-16 border-t border-white/5">
        <h2 className="text-sm font-semibold tracking-[0.2em] uppercase text-zinc-500 mb-8">
          How it works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Feature
            n="1"
            title="Bring your credentials"
            body="Upload your APNs .p8 key and Firebase service account JSON in the dashboard. Both are encrypted with AES-GCM before being written to D1."
          />
          <Feature
            n="2"
            title="Generate an API key"
            body="Keys are scoped to a single app and prefixed with the package name so they self-identify in logs: io.akshit.myapp|abc..."
          />
          <Feature
            n="3"
            title="Send from anywhere"
            body="Use the SDK or POST directly to /v1/send. Dispatched through Cloudflare Queues with automatic retries and a dead letter queue."
          />
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 py-16 border-t border-white/5">
        <h2 className="text-sm font-semibold tracking-[0.2em] uppercase text-zinc-500 mb-8">
          Built for production
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Principle
            title="Fully open source"
            body="MIT licensed. Self-host on your own Cloudflare account with one wrangler deploy."
          />
          <Principle
            title="Native tokens"
            body="No proprietary token format. You use real APNs device tokens and FCM registration tokens."
          />
          <Principle
            title="Delivery receipts"
            body="Every send returns a ticket id. Poll the receipt or subscribe to webhooks for delivered/failed events."
          />
          <Principle
            title="Rate limiting built-in"
            body="Per-app token bucket via Durable Objects. No surprise throttling from your own code."
          />
          <Principle
            title="Webhook events"
            body="Get HMAC-signed POSTs when a message is delivered or fails. Automatic token invalidation detection."
          />
          <Principle
            title="Encrypted credentials"
            body="Your APNs .p8 and FCM service account JSON are encrypted at rest. The raw key is never exposed via the API."
          />
        </div>
      </section>

      {/* CTA band */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="border border-white/10 rounded-2xl p-12 text-center bg-gradient-to-b from-white/[0.03] to-transparent">
          <h2 className="text-3xl sm:text-4xl font-semibold mb-3">
            Ship pushes in 5 minutes.
          </h2>
          <p className="text-zinc-400 max-w-xl mx-auto mb-8">
            Free forever on the hosted service, or self-host on your own
            Cloudflare account.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/sign-in"
              className="inline-flex items-center gap-2 rounded-full bg-white text-black px-6 py-3 text-sm font-medium hover:bg-zinc-200"
            >
              Sign in with GitHub
            </Link>
            <a
              href="https://github.com/akshitkrnagpal/edgepush"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 px-6 py-3 text-sm font-medium hover:bg-white/5"
            >
              Star on GitHub
            </a>
          </div>
        </div>
      </section>

      <footer className="max-w-5xl mx-auto px-6 py-12 border-t border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-sm text-zinc-500">
        <div className="flex items-center gap-3">
          <Logo />
          <p>
            &copy; {new Date().getFullYear()} edgepush. Open source, MIT
            licensed.
          </p>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/docs" className="hover:text-zinc-300">
            Docs
          </Link>
          <Link href="/legal/privacy" className="hover:text-zinc-300">
            Privacy
          </Link>
          <Link href="/legal/terms" className="hover:text-zinc-300">
            Terms
          </Link>
          <a
            href="https://github.com/akshitkrnagpal/edgepush"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-zinc-300"
          >
            GitHub
          </a>
        </div>
      </footer>
    </main>
  );
}

function Logo() {
  return (
    <div
      className="w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-bold"
      style={{
        background: "linear-gradient(135deg, #10b981, #06b6d4)",
      }}
    >
      ep
    </div>
  );
}

function Feature({
  n,
  title,
  body,
}: {
  n: string;
  title: string;
  body: string;
}) {
  return (
    <div>
      <div className="text-xs font-mono text-zinc-600 mb-3">0{n}</div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-zinc-400 leading-relaxed">{body}</p>
    </div>
  );
}

function Principle({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-zinc-400 leading-relaxed">{body}</p>
    </div>
  );
}
