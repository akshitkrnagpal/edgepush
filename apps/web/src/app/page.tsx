import Link from "next/link";

export default function Home() {
  return (
    <main className="flex-1 font-sans">
      {/* Meta strip */}
      <div className="border-b border-rule bg-surface font-mono text-[11px] text-muted">
        <div className="mx-auto flex max-w-[1440px] items-center gap-6 px-6 py-2 uppercase tracking-[0.12em]">
          <span>
            <span className="text-accent">●</span> edgepush.dev
          </span>
          <span>v0.0 · alpha</span>
          <span className="ml-auto hidden sm:inline">mit licensed</span>
          <span className="hidden sm:inline">● ready</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="mx-auto flex max-w-[1440px] items-center justify-between border-b border-rule px-6 py-5">
        <Link
          href="/"
          className="flex items-center gap-2.5 font-mono text-[15px] font-bold text-text"
        >
          <LogoMark />
          edgepush
        </Link>
        <ul className="hidden items-center gap-7 font-mono text-[12px] uppercase tracking-[0.1em] sm:flex">
          <li>
            <span className="text-accent">├&nbsp;</span>
            <span className="text-text">landing</span>
          </li>
          <li>
            <Link href="/docs" className="text-muted hover:text-text">
              docs
            </Link>
          </li>
          <li>
            <a
              href="https://github.com/akshitkrnagpal/edgepush"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted hover:text-text"
            >
              github
            </a>
          </li>
        </ul>
        <div className="flex items-center gap-3">
          <Link
            href="/sign-in"
            className="hidden rounded-none border border-rule-strong px-4 py-2 font-mono text-[12px] font-semibold text-text hover:border-text sm:inline-flex"
          >
            sign_in
          </Link>
          <Link
            href="/sign-in"
            className="inline-flex items-center gap-2 rounded-none bg-text px-4 py-2 font-mono text-[12px] font-semibold text-black hover:bg-accent"
          >
            <span className="text-accent">$</span> get_started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto grid max-w-[1440px] grid-cols-1 items-start gap-12 px-6 pt-16 pb-12 lg:grid-cols-[1.15fr_1fr] lg:gap-16 lg:pt-20">
        <div>
          <div className="mb-7 inline-flex items-center gap-2 border border-rule-strong px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-strong">
            <span className="ep-pulse h-1.5 w-1.5 rounded-full bg-accent" />
            open source alpha / free forever
          </div>
          <h1 className="mb-6 font-mono text-[56px] leading-[0.92] font-extrabold tracking-[-0.04em] text-text sm:text-[88px] lg:text-[108px]">
            push
            <br />
            from the <span className="text-accent">edge</span>
            <span className="text-muted">.</span>
          </h1>
          <p className="mb-8 max-w-[520px] font-sans text-[17px] leading-[1.55] text-muted-strong sm:text-[18px]">
            Open source alternative to Expo Push Notification Service. Send
            native iOS and Android pushes through a single API, running on
            Cloudflare Workers. Bring your own APNs and FCM credentials.
            Self-host in one{" "}
            <span className="font-mono text-text">wrangler deploy</span>.
          </p>
          <div className="mb-10 flex flex-wrap gap-3">
            <Link
              href="/sign-in"
              className="inline-flex items-center gap-2 rounded-none bg-text px-5 py-3 font-mono text-[12px] font-semibold text-black hover:bg-accent"
            >
              <span className="text-accent">$</span> sign_in_with_github
            </Link>
            <Link
              href="/docs"
              className="inline-flex items-center gap-2 rounded-none border border-rule-strong px-5 py-3 font-mono text-[12px] font-semibold text-text hover:border-text"
            >
              read_the_docs <span className="text-muted">─&gt;</span>
            </Link>
          </div>
          <div className="flex flex-wrap gap-5 font-mono text-[11px] text-muted">
            <span>
              <span className="text-accent">●</span> mit licensed
            </span>
            <span>
              <span className="text-accent">●</span> byo credentials
            </span>
            <span>
              <span className="text-accent">●</span> native tokens
            </span>
            <span>
              <span className="text-accent">●</span> one-command deploy
            </span>
          </div>
        </div>

        {/* Code panel */}
        <div className="border border-rule-strong bg-surface font-mono text-[13px] leading-[1.65]">
          <div className="flex items-center justify-between border-b border-rule px-4 py-2.5 text-[11px] uppercase tracking-[0.1em] text-muted">
            <div className="flex items-center gap-4">
              <span>
                <span className="text-accent">├&nbsp;</span>
                <span className="text-text">server.ts</span>
              </span>
              <span className="hidden sm:inline">curl</span>
              <span className="hidden sm:inline">python</span>
            </div>
            <span>
              <span className="text-accent">●</span> connected
            </span>
          </div>
          <pre className="overflow-x-auto p-5 text-text whitespace-pre">
            <code>
              <span className="text-muted">
                {"// one api. apns and fcm. no lock-in."}
              </span>
              {"\n"}
              <span className="text-accent">import</span>{" "}
              <span className="text-muted-strong">{"{ Edgepush }"}</span>{" "}
              <span className="text-accent">from</span>{" "}
              <span className="text-text">{'"@edgepush/sdk"'}</span>
              {";\n\n"}
              <span className="text-accent">const</span>{" "}
              <span className="text-muted-strong">client</span>
              {" = "}
              <span className="text-accent">new</span> Edgepush({"{"}
              {"\n  "}
              <span className="text-muted-strong">apiKey</span>
              {": process.env."}
              <span className="text-muted-strong">EDGEPUSH_KEY</span>
              {",\n"}
              {"});\n\n"}
              <span className="text-accent">await</span>{" "}
              <span className="text-muted-strong">client</span>.send({"{"}
              {"\n  "}
              <span className="text-muted-strong">to</span>
              {":     "}
              <span className="text-text">{'"ExponentPushToken[xx…]"'}</span>
              {",\n  "}
              <span className="text-muted-strong">title</span>
              {":  "}
              <span className="text-text">{'"New order"'}</span>
              {",\n  "}
              <span className="text-muted-strong">body</span>
              {":   "}
              <span className="text-text">{'"Your coffee is ready"'}</span>
              {",\n  "}
              <span className="text-muted-strong">data</span>
              {":   { "}
              <span className="text-muted-strong">orderId</span>
              {": "}
              <span className="text-text">{'"abc123"'}</span>
              {" },\n"}
              {"});\n"}
              <span className="text-muted">
                {"// → ticket_id: tk_01HX…  ● queued"}
              </span>
            </code>
          </pre>
        </div>
      </section>

      {/* Log stream */}
      <section className="mx-auto max-w-[1440px] px-6 pb-16">
        <div className="flex items-center justify-between border-t border-rule py-4 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
          <span>
            <span className="text-accent">tail -f</span> push-events.log
          </span>
          <span>
            8 events / last 60s <span className="text-accent">●</span> live
          </span>
        </div>
        <div className="overflow-hidden border border-rule-strong bg-surface px-5 py-4 font-mono text-[12.5px] leading-[1.9] text-muted-strong">
          <LogLine
            ts="2026-04-11T04:25:12.847Z"
            app="io.acme.pos"
            id="tk_01HX2A9P…4M"
            status="ok"
            label="delivered"
            meta="192ms · apns · device_ios 17.4"
          />
          <LogLine
            ts="2026-04-11T04:25:11.402Z"
            app="app.orbit.ios"
            id="tk_01HX2A9P…3K"
            status="ok"
            label="delivered"
            meta="144ms · apns · device_ios 17.4"
          />
          <LogLine
            ts="2026-04-11T04:25:10.219Z"
            app="com.ridehaus.android"
            id="tk_01HX2A9P…3J"
            status="pend"
            label="queued"
            meta="— · fcm · device_android 14"
          />
          <LogLine
            ts="2026-04-11T04:25:09.113Z"
            app="io.acme.pos"
            id="tk_01HX2A9P…3G"
            status="warn"
            label="retry 1/3"
            meta="apns_rate_limit · backoff 2s"
          />
          <LogLine
            ts="2026-04-11T04:25:07.005Z"
            app="com.pixeldiner"
            id="tk_01HX2A9P…3A"
            status="err"
            label="failed"
            meta="invalid_token · auto-removed"
          />
          <LogLine
            ts="2026-04-11T04:25:04.882Z"
            app="app.orbit.ios"
            id="tk_01HX2A9P…2Z"
            status="ok"
            label="delivered"
            meta="210ms · apns · device_ios 17.4"
          />
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-[1440px] border-t border-rule px-6 py-16">
        <div className="mb-8 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
          <span className="text-accent">─&nbsp;</span> how it works
        </div>
        <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
          <Step
            n="01"
            title="bring your credentials"
            body="Upload your APNs .p8 key and Firebase service account JSON in the dashboard. Both are encrypted with AES-GCM before being written to D1."
          />
          <Step
            n="02"
            title="generate an api key"
            body="Keys are scoped to a single app and prefixed with the package name so they self-identify in logs: io.acme.myapp|abc..."
          />
          <Step
            n="03"
            title="send from anywhere"
            body="Use the SDK or POST directly to /v1/send. Dispatched through Cloudflare Queues with automatic retries and a dead letter queue."
          />
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-[1440px] border-t border-rule px-6 py-16">
        <div className="mb-8 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
          <span className="text-accent">─&nbsp;</span> built for production
        </div>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          <Principle
            title="fully open source"
            body="MIT licensed. Self-host on your own Cloudflare account with one wrangler deploy. Fork the repo and own it forever."
          />
          <Principle
            title="native tokens"
            body="No proprietary token format. You use real APNs device tokens and FCM registration tokens. Migrate in and out at will."
          />
          <Principle
            title="delivery receipts"
            body="Every send returns a ticket id. Poll the receipt or subscribe to webhooks for delivered and failed events."
          />
          <Principle
            title="rate limiting built-in"
            body="Per-app token bucket via Durable Objects. No surprise throttling from your own code. Tune it as you grow."
          />
          <Principle
            title="webhook events"
            body="HMAC-signed POSTs when a message is delivered or fails. Automatic invalid-token detection and cleanup."
          />
          <Principle
            title="encrypted credentials"
            body="Your APNs .p8 and FCM service account JSON are encrypted at rest. The raw key is never exposed via the API."
          />
        </div>
      </section>

      {/* CTA band */}
      <section className="mx-auto max-w-[1440px] px-6 py-20">
        <div className="border border-rule-strong bg-surface px-8 py-16 sm:px-16">
          <div className="mb-4 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
            <span className="text-accent">$&nbsp;</span> ready_to_ship
          </div>
          <h2 className="mb-4 max-w-2xl font-mono text-3xl font-bold leading-[1.05] tracking-[-0.02em] text-text sm:text-4xl">
            Ship pushes in{" "}
            <span className="text-accent">five minutes</span>.
          </h2>
          <p className="mb-8 max-w-xl font-sans text-[16px] text-muted-strong">
            Free forever on the hosted service, or self-host on your own
            Cloudflare account. No credit card, no seat limits, no upsell.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/sign-in"
              className="inline-flex items-center gap-2 rounded-none bg-text px-5 py-3 font-mono text-[12px] font-semibold text-black hover:bg-accent"
            >
              <span className="text-accent">$</span> sign_in_with_github
            </Link>
            <a
              href="https://github.com/akshitkrnagpal/edgepush"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-none border border-rule-strong px-5 py-3 font-mono text-[12px] font-semibold text-text hover:border-text"
            >
              star_on_github <span className="text-muted">─&gt;</span>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mx-auto flex max-w-[1440px] flex-col gap-8 border-t border-rule px-6 py-12 font-mono text-[11px] text-muted sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <LogoMark />
          <div>
            <p className="text-text">edgepush</p>
            <p className="mt-1">
              &copy; {new Date().getFullYear()} · open source · mit licensed
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-6 uppercase tracking-[0.1em]">
          <Link href="/docs" className="hover:text-text">
            docs
          </Link>
          <Link href="/legal/privacy" className="hover:text-text">
            privacy
          </Link>
          <Link href="/legal/terms" className="hover:text-text">
            terms
          </Link>
          <a
            href="https://github.com/akshitkrnagpal/edgepush"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-text"
          >
            github
          </a>
        </div>
      </footer>
    </main>
  );
}

function LogoMark() {
  return (
    <span className="relative flex h-[22px] w-[22px] items-center justify-center border border-accent font-mono text-[11px] font-extrabold text-accent">
      ep
      <span className="absolute -left-[2px] -top-[2px] h-[3px] w-[3px] bg-accent" />
      <span className="absolute -right-[2px] -bottom-[2px] h-[3px] w-[3px] bg-accent" />
    </span>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div>
      <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
        <span className="text-accent">├&nbsp;</span>
        {n}
      </div>
      <h3 className="mb-2 font-mono text-[18px] font-bold text-text">
        {title}
      </h3>
      <p className="font-sans text-[14px] leading-[1.6] text-muted-strong">
        {body}
      </p>
    </div>
  );
}

function Principle({ title, body }: { title: string; body: string }) {
  return (
    <div className="border-t border-rule pt-6">
      <h3 className="mb-2 font-mono text-[16px] font-bold text-text">
        {title}
      </h3>
      <p className="font-sans text-[14px] leading-[1.6] text-muted-strong">
        {body}
      </p>
    </div>
  );
}

function LogLine({
  ts,
  app,
  id,
  status,
  label,
  meta,
}: {
  ts: string;
  app: string;
  id: string;
  status: "ok" | "warn" | "err" | "pend";
  label: string;
  meta: string;
}) {
  const color =
    status === "ok"
      ? "text-success"
      : status === "warn"
        ? "text-warning"
        : status === "err"
          ? "text-error"
          : "text-muted";
  const dot = status === "pend" ? "○" : "●";
  return (
    <div className="grid grid-cols-[auto_1fr] gap-x-4 whitespace-nowrap sm:grid-cols-[190px_minmax(140px,auto)_minmax(180px,auto)_90px_1fr]">
      <span className="text-muted">{ts}</span>
      <span className="text-text">{app}</span>
      <span className="hidden text-muted sm:inline">{id}</span>
      <span className={color}>
        {dot} {label}
      </span>
      <span className="hidden sm:inline">{meta}</span>
    </div>
  );
}
