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
          <span>v0.2 · alpha</span>
          <a
            href="https://github.com/akshitkrnagpal/edgepush"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden hover:text-text sm:inline"
          >
            github.com/akshitkrnagpal/edgepush
          </a>
          <span className="ml-auto hidden sm:inline">agpl-3.0 + mit dual</span>
          <span className="hidden sm:inline">
            <span className="text-success">●</span> live
          </span>
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
            free tier · no credit card
          </div>
          <h1 className="mb-6 font-mono text-[56px] leading-[0.92] font-extrabold tracking-[-0.04em] text-text sm:text-[88px] lg:text-[108px]">
            push
            <br />
            from the <span className="text-accent">edge</span>
            <span className="text-muted">.</span>
          </h1>
          <p className="mb-8 max-w-[520px] font-sans text-[17px] leading-[1.55] text-muted-strong sm:text-[18px]">
            Hosted push notifications for iOS and Android. Bring your APNs
            and FCM credentials, get one HTTP endpoint, ship in five minutes.
            Free tier covers 10K events/month. Pro is $29 when you outgrow it.
          </p>
          <div className="mb-10 flex flex-wrap gap-3">
            <Link
              href="/sign-in"
              className="inline-flex items-center gap-2 rounded-none bg-text px-5 py-3 font-mono text-[12px] font-semibold text-black hover:bg-accent"
            >
              <GithubMark />
              sign_in_with_github
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
              <span className="text-accent">●</span> byo credentials
            </span>
            <span>
              <span className="text-accent">●</span> native tokens
            </span>
            <span>
              <span className="text-accent">●</span> rich notifications
            </span>
            <span>
              <span className="text-accent">●</span> open source ·{" "}
              <Link href="/selfhost" className="hover:text-text">
                self-host
              </Link>
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
            </div>
            <span>
              <span className="text-accent">$</span> example
            </span>
          </div>
          <pre className="overflow-x-auto p-5 text-text whitespace-pre">
            <code>
              <span className="text-muted">
                {"// rich notification, collapse-id, expiration."}
              </span>
              {"\n"}
              <span className="text-muted">
                {"// the full APNs surface, on a single line per field."}
              </span>
              {"\n\n"}
              <span className="text-accent">import</span>{" "}
              <span className="text-muted-strong">{"{ Edgepush }"}</span>{" "}
              <span className="text-accent">from</span>{" "}
              <span className="text-text">{'"@edgepush/sdk"'}</span>
              {";\n\n"}
              <span className="text-accent">const</span>{" "}
              <span className="text-muted-strong">edge</span>
              {" = "}
              <span className="text-accent">new</span> Edgepush({"{"}
              {"\n  "}
              <span className="text-muted-strong">apiKey</span>
              {": process.env."}
              <span className="text-muted-strong">EDGEPUSH_API_KEY</span>
              {",\n"}
              {"});\n\n"}
              <span className="text-accent">await</span>{" "}
              <span className="text-muted-strong">edge</span>.send({"{"}
              {"\n  "}
              <span className="text-muted-strong">to</span>
              {":              "}
              <span className="text-text">{'"a1b2c3d4…"'}</span>
              {",\n  "}
              <span className="text-muted-strong">title</span>
              {":           "}
              <span className="text-text">{'"New order #4271"'}</span>
              {",\n  "}
              <span className="text-muted-strong">body</span>
              {":            "}
              <span className="text-text">{'"2x flat white, table 3"'}</span>
              {",\n  "}
              <span className="text-muted-strong">image</span>
              {":           "}
              <span className="text-text">{'"https://cdn.acme.app/o/4271.jpg"'}</span>
              {",\n  "}
              <span className="text-muted-strong">mutableContent</span>
              {":  "}
              <span className="text-accent">true</span>
              {",  "}
              <span className="text-muted">{"// iOS NSE"}</span>
              {"\n  "}
              <span className="text-muted-strong">collapseId</span>
              {":      "}
              <span className="text-text">{'"order-4271"'}</span>
              {",  "}
              <span className="text-muted">{"// replace prior"}</span>
              {"\n  "}
              <span className="text-muted-strong">expirationAt</span>
              {":    "}
              <span className="text-muted-strong">Date</span>
              {".now() / "}
              <span className="text-text">1000</span>
              {" + "}
              <span className="text-text">600</span>
              {",\n});\n\n"}
              <span className="text-muted">
                {"// → ticket.id: tk_01HX2A9P4M  "}
                <span className="text-success">●</span>
                {" queued"}
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
            <span className="text-accent">$</span> example feed
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
            meta="- · fcm · device_android 14"
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

      {/* Quickstart - multi-language code panels */}
      <section className="mx-auto max-w-[1440px] border-t border-rule px-6 py-16">
        <div className="mb-8 flex items-baseline justify-between gap-4">
          <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
            <span className="text-accent">─&nbsp;</span> quickstart
          </div>
          <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
            send from any runtime
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <CodePanel
            tab="node.ts"
            label="@edgepush/sdk"
            lines={[
              [
                ["muted", "// npm install @edgepush/sdk"],
              ],
              [
                ["accent", "import"],
                ["", " "],
                ["muted-strong", "{ Edgepush }"],
                ["", " "],
                ["accent", "from"],
                ["", " "],
                ["text", '"@edgepush/sdk"'],
                ["", ";"],
              ],
              [],
              [
                ["accent", "const"],
                ["", " "],
                ["muted-strong", "client"],
                ["", " = "],
                ["accent", "new"],
                ["", " Edgepush({ "],
                ["muted-strong", "apiKey"],
                ["", ": "],
                ["text", '"com.acme.app|sk_…"'],
                ["", " });"],
              ],
              [],
              [
                ["accent", "await"],
                ["", " "],
                ["muted-strong", "client"],
                ["", ".send({"],
              ],
              [
                ["", "  "],
                ["muted-strong", "to"],
                ["", ":    "],
                ["text", '"a1b2c3d4…"'],
                ["", ","],
              ],
              [
                ["", "  "],
                ["muted-strong", "title"],
                ["", ": "],
                ["text", '"Hello"'],
                ["", ","],
              ],
              [
                ["", "  "],
                ["muted-strong", "body"],
                ["", ":  "],
                ["text", '"From Node"'],
                ["", ","],
              ],
              [["", "});"]],
            ]}
          />
          <CodePanel
            tab="curl"
            label="POST /v1/send"
            lines={[
              [
                ["muted", "# any HTTP client works"],
              ],
              [["text", "curl https://api.edgepush.dev/v1/send \\"]],
              [
                ["", "  -H "],
                ["text", "\"authorization: Bearer com.acme.app|sk_…\""],
                ["", " \\"],
              ],
              [
                ["", "  -H "],
                ["text", "\"content-type: application/json\""],
                ["", " \\"],
              ],
              [["", "  -d "], ["text", "'{"]],
              [
                ["", "    "],
                ["text", "\"messages\": [{"],
              ],
              [
                ["", "      "],
                ["text", "\"to\": \"a1b2c3d4…\","],
              ],
              [
                ["", "      "],
                ["text", "\"title\": \"Hello\","],
              ],
              [
                ["", "      "],
                ["text", "\"body\": \"From curl\""],
              ],
              [["", "    "], ["text", "}]"]],
              [["", "  "], ["text", "}'"]],
            ]}
          />
        </div>
        <div className="mt-6 font-mono text-[11px] text-muted">
          react native? bun? deno? same SDK. needs only{" "}
          <span className="text-text">fetch</span>.
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
            body="Keys are scoped to a single app and prefixed with the package name so they self-identify in logs: com.acme.myapp|sk_..."
          />
          <Step
            n="03"
            title="send from anywhere"
            body="Use the SDK or POST directly to /v1/send. Dispatched through Cloudflare Queues with automatic retries and a dead letter queue."
          />
        </div>
      </section>

      {/* Webhook example */}
      <section className="mx-auto max-w-[1440px] border-t border-rule px-6 py-16">
        <div className="mb-8 flex items-baseline justify-between gap-4">
          <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
            <span className="text-accent">─&nbsp;</span> webhook events
          </div>
          <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
            HMAC-signed POST
          </div>
        </div>
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_1.2fr] lg:items-start">
          <div>
            <h3 className="mb-3 font-mono text-[20px] font-bold text-text">
              Push your delivery state.
            </h3>
            <p className="mb-4 max-w-md font-sans text-[15px] leading-[1.6] text-muted-strong">
              Configure a webhook URL in the dashboard and edgepush will POST
              every state change to your endpoint with an HMAC-SHA256 signature
              over the raw body. No polling required.
            </p>
            <ul className="space-y-2 font-mono text-[12px] text-muted-strong">
              <li>
                <span className="text-success">●</span> message.delivered
              </li>
              <li>
                <span className="text-warning">●</span> message.retry
              </li>
              <li>
                <span className="text-error">●</span> message.failed
              </li>
              <li>
                <span className="text-pending">○</span> message.invalid_token
              </li>
            </ul>
          </div>
          <CodePanel
            tab="POST /your/webhook"
            label={
              <>
                <span className="text-success">●</span> 200 OK
              </>
            }
            lines={[
              [
                ["muted", "// headers"],
              ],
              [
                ["muted-strong", "x-edgepush-event"],
                ["", ":     "],
                ["text", "message.delivered"],
              ],
              [
                ["muted-strong", "x-edgepush-signature"],
                ["", ": "],
                ["text", "sha256=9f86d081…"],
              ],
              [
                ["muted-strong", "x-edgepush-id"],
                ["", ":        "],
                ["text", "evt_01HX2A9P4M"],
              ],
              [],
              [
                ["muted", "// body"],
              ],
              [["text", "{"]],
              [
                ["", "  "],
                ["text", "\"event\""],
                ["", ": "],
                ["text", "\"message.delivered\","],
              ],
              [
                ["", "  "],
                ["text", "\"id\""],
                ["", ":    "],
                ["text", "\"tk_01HX2A9P4M\","],
              ],
              [
                ["", "  "],
                ["text", "\"app\""],
                ["", ":   "],
                ["text", "\"com.acme.app\","],
              ],
              [
                ["", "  "],
                ["text", "\"to\""],
                ["", ":    "],
                ["text", "\"a1b2c3d4…\","],
              ],
              [
                ["", "  "],
                ["text", "\"platform\""],
                ["", ": "],
                ["text", "\"ios\","],
              ],
              [
                ["", "  "],
                ["text", "\"latency_ms\""],
                ["", ": "],
                ["text", "192"],
              ],
              [["text", "}"]],
            ]}
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
            body="AGPL-3.0 server, MIT SDK and CLI. Self-host on your own Cloudflare account, two wrangler deploys, no telemetry. Fork the repo and own it forever."
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
            body="Per-app token bucket via Durable Objects. Survives Worker restarts, scoped to each app, retries with backoff on overflow."
          />
          <Principle
            title="webhook events"
            body="HMAC-signed POSTs when a message is delivered, retried, or failed. Invalid tokens are flagged on the receipt so your code can prune them."
          />
          <Principle
            title="encrypted credentials"
            body="Your APNs .p8 and FCM service account JSON are encrypted at rest. The raw key is never exposed via the API."
          />
        </div>
      </section>

      {/* Comparison table */}
      <section className="mx-auto max-w-[1440px] border-t border-rule px-6 py-16">
        <div className="mb-8 flex items-baseline justify-between gap-4">
          <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
            <span className="text-accent">─&nbsp;</span> how it compares
          </div>
          <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
            edgepush vs hosted push providers
          </div>
        </div>
        <div className="overflow-x-auto border border-rule-strong bg-surface">
          <table className="w-full font-mono text-[12.5px]">
            <thead>
              <tr className="border-b border-rule-strong bg-surface-2 text-left uppercase tracking-[0.1em] text-muted">
                <th className="px-5 py-3 font-medium"> </th>
                <th className="px-5 py-3 font-bold text-text">edgepush</th>
                <th className="px-5 py-3 font-medium">expo push</th>
                <th className="px-5 py-3 font-medium">onesignal</th>
                <th className="px-5 py-3 font-medium">knock</th>
              </tr>
            </thead>
            <tbody className="text-muted-strong">
              <CompareRow
                label="open source"
                values={["yes", "no", "no", "no"]}
              />
              <CompareRow
                label="self-hostable"
                values={["yes", "no", "no", "no"]}
              />
              <CompareRow
                label="byo apns + fcm"
                values={["yes", "no", "yes", "yes"]}
              />
              <CompareRow
                label="native token format"
                values={["yes", "no (proprietary)", "yes", "yes"]}
              />
              <CompareRow
                label="rich notifications (images)"
                values={["yes", "no", "yes", "yes"]}
              />
              <CompareRow
                label="apns collapse-id"
                values={["yes", "no", "yes", "yes"]}
              />
              <CompareRow
                label="fine-grained apns push types (voip, location, ...)"
                values={["yes", "no", "partial", "partial"]}
              />
              <CompareRow
                label="reliable silent / background push"
                values={["yes", "best effort", "yes", "yes"]}
              />
              <CompareRow
                label="absolute notification expiration"
                values={["yes", "no", "yes", "yes"]}
              />
              <CompareRow
                label="delivery receipts + retries + dlq"
                values={["yes", "best effort", "yes", "yes"]}
              />
              <CompareRow
                label="hard rate ceiling"
                values={["per-app, tunable", "600/sec global", "n/a", "n/a"]}
              />
              <CompareRow
                label="runs on cloudflare workers"
                values={["yes", "no", "no", "no"]}
              />
              <CompareRow
                label="per-message pricing"
                values={["no", "no (rate-limited)", "yes", "yes"]}
              />
              <CompareRow
                label="vendor lock-in"
                values={["none", "high", "medium", "medium"]}
              />
              <CompareRow
                label="cost (10k pushes/mo)"
                values={["$0", "$0", "≈ $0", "≈ $25"]}
              />
            </tbody>
          </table>
        </div>
        <p className="mt-4 font-sans text-[12px] text-muted">
          Comparison reflects publicly documented pricing and features as of
          April 2026. Other providers may have changed; check their docs.
        </p>
      </section>

      {/* Pricing */}
      <section className="mx-auto max-w-[1440px] border-t border-rule px-6 py-16">
        <div className="mb-8 flex items-baseline justify-between gap-4">
          <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
            <span className="text-accent">─&nbsp;</span> pricing
          </div>
          <Link
            href="/pricing"
            className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted hover:text-text"
          >
            full pricing →
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <PricingCard
            tag="free"
            title="$0"
            tagline="edgepush.dev hosted"
            body="No credit card. The fastest way to try edgepush against a real device. Sized for side projects and indie apps that haven't shipped yet."
            cta={{ href: "/sign-in", label: "$ sign_in_with_github" }}
            features={[
              "1 app",
              "10K events / month",
              "7-day delivery log",
              "BYO apns + fcm credentials",
              "delivery receipts + webhooks",
              "support via github issues",
            ]}
          />
          <PricingCard
            tag="pro"
            title="$29"
            tagline="edgepush.dev hosted"
            body="For indie shippers running a few apps in production. Same infrastructure as free, just with the room to actually use it. Priority email support direct from the operator."
            cta={{ href: "/pricing", label: "$ upgrade_to_pro" }}
            features={[
              "3 apps",
              "50K events / month",
              "14-day delivery log",
              "everything in free, plus:",
              "priority email support",
              "credential health alerts",
            ]}
          />
          <PricingCard
            tag="self-host"
            title="$0"
            tagline="your cloudflare account"
            body="Same code, your infra, your data. Cloudflare's free tier covers most apps. You own the credentials, the rate limits, the deploy cadence. No edgepush.dev in the middle."
            cta={{
              href: "/selfhost",
              label: "$ self_host_guide",
            }}
            features={[
              "unlimited apps + events",
              "agpl-3.0 server source",
              "your D1, KV, queue, DO",
              "your apns + fcm credentials",
              "tunable rate limits",
              "no telemetry, no operator",
            ]}
          />
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-[1440px] border-t border-rule px-6 py-16">
        <div className="mb-8 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
          <span className="text-accent">─&nbsp;</span> faq
        </div>
        <div className="grid grid-cols-1 gap-x-12 gap-y-8 md:grid-cols-2">
          <FaqItem
            q="What if I already have APNs and FCM set up?"
            a="Perfect, that's the model. You upload your existing .p8 key and Firebase service account JSON in the dashboard. edgepush never gets new credentials, you're using yours."
          />
          <FaqItem
            q="Where are my credentials stored?"
            a="Encrypted with AES-GCM and stored in a Cloudflare D1 row scoped to your app. The encryption key lives in a Worker secret, not in the database. The raw credential is never returned by the API after upload."
          />
          <FaqItem
            q="Can I migrate from Expo Push?"
            a="Yes. Expo wraps APNs and FCM with its own ExponentPushToken format. To migrate, you switch your app to register with the native APNs and FCM tokens directly (or read them from your existing Firebase project), then point your server at /v1/send. The token format is the only meaningful change."
          />
          <FaqItem
            q="What's the rate limit on the hosted instance?"
            a="1000 pushes per minute per app, per-app token bucket via a Durable Object. If you need more, self-host and tune the limit yourself, or open an issue and we can talk about raising it."
          />
          <FaqItem
            q="Do you store device tokens for me?"
            a="No, by design. edgepush is a dispatch layer, not a device registry. You manage your own token list (your users, your database, your truth). The receipt for each send tells you when a token has gone invalid so you can prune it."
          />
          <FaqItem
            q="Is this production-ready?"
            a="The send + dispatch + receipts + webhooks + dashboard + credential health probes + nightly D1 backup + Stripe billing + operator runbook all shipped in v0.1. 70 unit tests cover the cryptographic and response-interpretation surfaces. There are no end-to-end integration tests against a real D1 yet, so APIs may still shift before 1.0. Honest answer: I'd run a side project on it today, I'd want a week of soak time before betting a paying customer's launch on it."
          />
          <FaqItem
            q="Why Cloudflare instead of AWS or Vercel?"
            a="Workers + D1 + Queues + Durable Objects + Cloudflare Images is the only stack today where the entire push pipeline (HTTP intake, queue, rate limiter, storage, dispatch) runs on free-tier primitives at the edge. No cold starts on the hot path. No per-region routing decisions. Just one runtime."
          />
          <FaqItem
            q="What about web push, in-app, email, SMS?"
            a="Out of scope for now. edgepush is deliberately focused on native iOS and Android push. If you want a multi-channel orchestrator, look at Knock. If you want an alternative for those other channels too, open an issue."
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
            Ship pushes by{" "}
            <span className="text-accent">end of day</span>.
          </h2>
          <p className="mb-8 max-w-xl font-sans text-[16px] text-muted-strong">
            Free hosted tier on edgepush.dev. Pro is $29/mo when you outgrow
            it. Or run the whole stack on your own Cloudflare account, no
            credit card, no operator in the middle.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/sign-in"
              className="inline-flex items-center gap-2 rounded-none bg-text px-5 py-3 font-mono text-[12px] font-semibold text-black hover:bg-accent"
            >
              <GithubMark />
              sign_in_with_github
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
      <footer className="mx-auto grid max-w-[1440px] grid-cols-1 gap-10 border-t border-rule px-6 py-12 font-mono text-[11px] text-muted sm:grid-cols-[1fr_auto_auto_auto]">
        <div className="flex items-start gap-3">
          <LogoMark />
          <div>
            <p className="text-text">edgepush</p>
            <p className="mt-1">
              &copy; {new Date().getFullYear()} · server agpl-3.0 · sdk + cli mit
            </p>
            <p className="mt-1">v0.2 · alpha</p>
          </div>
        </div>
        <FooterColumn title="product">
          <FooterLink href="/docs">docs</FooterLink>
          <FooterLink href="/pricing">pricing</FooterLink>
          <FooterLink href="/sign-in">dashboard</FooterLink>
          <FooterLink href="/selfhost">self-host</FooterLink>
        </FooterColumn>
        <FooterColumn title="packages">
          <FooterLink
            href="https://www.npmjs.com/package/@edgepush/sdk"
            external
          >
            @edgepush/sdk
          </FooterLink>
          <FooterLink
            href="https://www.npmjs.com/package/@edgepush/cli"
            external
          >
            @edgepush/cli
          </FooterLink>
          <FooterLink
            href="https://github.com/akshitkrnagpal/edgepush/releases"
            external
          >
            releases
          </FooterLink>
        </FooterColumn>
        <FooterColumn title="more">
          <FooterLink
            href="https://github.com/akshitkrnagpal/edgepush"
            external
          >
            github
          </FooterLink>
          <FooterLink
            href="https://github.com/akshitkrnagpal/edgepush/issues"
            external
          >
            issues
          </FooterLink>
          <FooterLink href="/legal/privacy">privacy</FooterLink>
          <FooterLink href="/legal/terms">terms</FooterLink>
        </FooterColumn>
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

function GithubMark() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.4 3-.405 1.02.005 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
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

type Tone = "" | "accent" | "text" | "muted" | "muted-strong";

function tone(t: Tone): string {
  if (t === "accent") return "text-accent";
  if (t === "text") return "text-text";
  if (t === "muted") return "text-muted";
  if (t === "muted-strong") return "text-muted-strong";
  return "";
}

function CodePanel({
  tab,
  label,
  lines,
}: {
  tab: string;
  label: React.ReactNode;
  lines: Array<Array<[Tone, string]>>;
}) {
  return (
    <div className="border border-rule-strong bg-surface font-mono text-[12.5px] leading-[1.65]">
      <div className="flex items-center justify-between border-b border-rule px-4 py-2.5 text-[11px] uppercase tracking-[0.1em] text-muted">
        <span>
          <span className="text-accent">├&nbsp;</span>
          <span className="text-text">{tab}</span>
        </span>
        <span>{label}</span>
      </div>
      <pre className="overflow-x-auto p-5 whitespace-pre">
        <code>
          {lines.map((line, i) => (
            <span key={i}>
              {line.length === 0 ? (
                "\n"
              ) : (
                <>
                  {line.map(([t, text], j) => (
                    <span key={j} className={tone(t)}>
                      {text}
                    </span>
                  ))}
                  {"\n"}
                </>
              )}
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}

function CompareRow({
  label,
  values,
}: {
  label: string;
  values: [string, string, string, string];
}) {
  const isYes = (v: string) => v === "yes" || v === "$0" || v === "none";
  return (
    <tr className="border-b border-rule last:border-b-0">
      <td className="px-5 py-3 text-text">{label}</td>
      {values.map((v, i) => (
        <td
          key={i}
          className={`px-5 py-3 ${
            i === 0 && isYes(v) ? "text-accent" : "text-muted-strong"
          }`}
        >
          {i === 0 && isYes(v) ? <span className="mr-1">●</span> : null}
          {v}
        </td>
      ))}
    </tr>
  );
}

function PricingCard({
  tag,
  title,
  tagline,
  body,
  features,
  cta,
}: {
  tag: string;
  title: string;
  tagline: string;
  body: string;
  features: string[];
  cta: { href: string; label: string; external?: boolean };
}) {
  const linkClass =
    "mt-6 inline-flex items-center gap-2 rounded-none bg-text px-5 py-3 font-mono text-[12px] font-semibold text-black hover:bg-accent";
  return (
    <div className="flex flex-col border border-rule-strong bg-surface p-8">
      <div className="mb-4 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
        <span className="text-accent">├&nbsp;</span>
        {tag}
      </div>
      <div className="mb-1 flex items-baseline gap-3">
        <span className="font-mono text-[44px] font-extrabold leading-none text-text">
          {title}
        </span>
        <span className="font-mono text-[12px] text-muted">/ forever</span>
      </div>
      <div className="mb-5 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
        {tagline}
      </div>
      <p className="mb-6 max-w-md font-sans text-[14px] leading-[1.6] text-muted-strong">
        {body}
      </p>
      <ul className="mb-2 space-y-2 font-mono text-[12px] text-muted-strong">
        {features.map((f) => (
          <li key={f}>
            <span className="text-accent">●</span> {f}
          </li>
        ))}
      </ul>
      {cta.external ? (
        <a
          href={cta.href}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
        >
          {cta.label}
        </a>
      ) : (
        <Link href={cta.href} className={linkClass}>
          {cta.label}
        </Link>
      )}
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <div>
      <h3 className="mb-2 font-mono text-[14px] font-bold text-text">
        <span className="text-accent">?&nbsp;</span>
        {q}
      </h3>
      <p className="font-sans text-[14px] leading-[1.6] text-muted-strong">
        {a}
      </p>
    </div>
  );
}

function FooterColumn({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="mb-1 uppercase tracking-[0.12em] text-text">{title}</p>
      {children}
    </div>
  );
}

function FooterLink({
  href,
  external,
  children,
}: {
  href: string;
  external?: boolean;
  children: React.ReactNode;
}) {
  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-text"
      >
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className="hover:text-text">
      {children}
    </Link>
  );
}
