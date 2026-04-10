import Link from "next/link";

export default function Home() {
  return (
    <main className="flex-1">
      <nav className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <span className="text-lg font-semibold">edgepush</span>
        <div className="flex items-center gap-3">
          <a
            href="https://github.com/akshitkrnagpal/edgepush"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-zinc-400 hover:text-zinc-200"
          >
            GitHub
          </a>
          <Link
            href="/sign-in"
            className="rounded-full bg-white text-black px-4 py-1.5 text-sm font-medium hover:bg-zinc-200"
          >
            Sign in
          </Link>
        </div>
      </nav>

      <section className="max-w-5xl mx-auto px-6 pt-20 pb-16">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-1.5 text-xs text-zinc-400 mb-8">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          Open source alpha
        </div>
        <h1 className="text-5xl sm:text-7xl font-semibold tracking-tight max-w-3xl leading-[1.05]">
          Push notifications at the edge.
        </h1>
        <p className="mt-6 text-lg sm:text-xl text-zinc-400 max-w-2xl leading-relaxed">
          Open source alternative to Expo Push Notification Service. Send
          native iOS and Android pushes through a single API, deployed on
          Cloudflare Workers.
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-3">
          <Link
            href="/sign-in"
            className="inline-flex items-center gap-2 rounded-full bg-white text-black px-5 py-2.5 text-sm font-medium hover:bg-zinc-200"
          >
            Start sending
          </Link>
          <a
            href="https://github.com/akshitkrnagpal/edgepush"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-2.5 text-sm font-medium hover:bg-white/5"
          >
            Star on GitHub
          </a>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-16 border-t border-white/5">
        <h2 className="text-sm font-semibold tracking-[0.2em] uppercase text-zinc-500 mb-8">
          How it works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Feature
            n="1"
            title="Bring your credentials"
            body="Upload your APNs .p8 key and Firebase service account JSON. Encrypted at rest with AES-GCM."
          />
          <Feature
            n="2"
            title="Get an API key"
            body="API keys are scoped to a single app and start with the package name so they self-identify in logs."
          />
          <Feature
            n="3"
            title="Send from anywhere"
            body="POST to /v1/send with up to 100 messages per call. Dispatched through Cloudflare Queues with automatic retries."
          />
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-16 border-t border-white/5">
        <h2 className="text-sm font-semibold tracking-[0.2em] uppercase text-zinc-500 mb-8">
          Principles
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
            title="Free to use"
            body="The hosted edgepush service is free. Cloudflare's edge makes the infrastructure cost negligible."
          />
          <Principle
            title="Encrypted credentials"
            body="Your APNs .p8 and FCM service account JSON are encrypted with AES-GCM before hitting D1."
          />
        </div>
      </section>

      <footer className="max-w-5xl mx-auto px-6 py-12 border-t border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-sm text-zinc-500">
        <p>
          &copy; {new Date().getFullYear()} edgepush. Open source, MIT
          licensed.
        </p>
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
