/**
 * Self-host landing.
 *
 * Audience: developers who want to RUN their own edgepush instance, not
 * customers who want to USE the hosted one. Different vocabulary, different
 * CTAs, different proof points than the SaaS landing at /.
 *
 * This page is also intended to be the index of a separate marketing
 * worker (selfhost.edgepush.dev) deployed via apps/web/wrangler.selfhost.jsonc.
 * On that worker, middleware rewrites `/` → `/selfhost` so visitors land
 * here directly without seeing /selfhost in the URL.
 */

import Link from "next/link";

import { CURRENT_VERSION } from "@/lib/version";

export const metadata = {
  title: "edgepush — self-host",
  description:
    "Run edgepush on your own Cloudflare account. AGPL-3.0 server, MIT SDK and CLI. One repo, two wrangler deploys, no telemetry.",
};

export default function SelfHostPage() {
  return (
    <main className="flex-1 font-sans">
      {/* Meta strip */}
      <div className="border-b border-rule bg-surface font-mono text-[11px] text-muted">
        <div className="mx-auto flex max-w-[1440px] items-center gap-6 px-6 py-2 uppercase tracking-[0.12em]">
          <span>
            <span className="text-accent">●</span> edgepush · self-host
          </span>
          <span>v{CURRENT_VERSION} · alpha</span>
          <a
            href="https://github.com/akshitkrnagpal/edgepush"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden hover:text-text sm:inline"
          >
            github.com/akshitkrnagpal/edgepush
          </a>
          <span className="ml-auto hidden sm:inline">agpl-3.0 server · mit sdk</span>
          <Link href="/" className="hidden hover:text-text sm:inline">
            ← hosted edgepush.dev
          </Link>
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
            <Link href="/" className="text-muted hover:text-text">
              hosted
            </Link>
          </li>
          <li>
            <span className="text-accent">├&nbsp;</span>
            <span className="text-text">self-host</span>
          </li>
          <li>
            <a
              href="https://github.com/akshitkrnagpal/edgepush/blob/main/SELFHOST.md"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted hover:text-text"
            >
              guide
            </a>
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
          <a
            href="https://github.com/akshitkrnagpal/edgepush/releases/latest"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden rounded-none border border-rule-strong px-4 py-2 font-mono text-[12px] font-semibold text-text hover:border-text sm:inline-flex"
          >
            latest_release
          </a>
          <a
            href="https://github.com/akshitkrnagpal/edgepush/blob/main/SELFHOST.md"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-none bg-text px-4 py-2 font-mono text-[12px] font-semibold text-black hover:bg-accent"
          >
            <span className="text-accent">$</span> deploy_your_own
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto grid max-w-[1440px] grid-cols-1 items-start gap-12 px-6 pt-16 pb-12 lg:grid-cols-[1.15fr_1fr] lg:gap-16 lg:pt-20">
        <div>
          <div className="mb-7 inline-flex items-center gap-2 border border-rule-strong px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-strong">
            <span className="ep-pulse h-1.5 w-1.5 rounded-full bg-accent" />
            agpl-3.0 · run it yourself · no telemetry
          </div>
          <h1 className="mb-6 font-mono text-[56px] leading-[0.92] font-extrabold tracking-[-0.04em] text-text sm:text-[80px] lg:text-[96px]">
            your push.
            <br />
            your <span className="text-accent">stack</span>
            <span className="text-muted">.</span>
          </h1>
          <p className="mb-8 max-w-[540px] font-sans text-[17px] leading-[1.55] text-muted-strong sm:text-[18px]">
            Clone the repo. Create a D1, a KV, two queues, a Durable Object.
            Drop your APNs and FCM credentials in. Two{" "}
            <span className="font-mono text-text">wrangler deploy</span>s
            and you have a push notification service that nobody else can
            see, throttle, or take down. AGPL-3.0 means you can fork it and
            keep it forever.
          </p>
          <div className="mb-10 flex flex-wrap gap-3">
            <a
              href="https://github.com/akshitkrnagpal/edgepush/blob/main/SELFHOST.md"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-none bg-text px-5 py-3 font-mono text-[12px] font-semibold text-black hover:bg-accent"
            >
              <span className="text-accent">$</span> read_selfhost_md
            </a>
            <a
              href="https://github.com/akshitkrnagpal/edgepush"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-none border border-rule-strong px-5 py-3 font-mono text-[12px] font-semibold text-text hover:border-text"
            >
              <GithubMark />
              clone_the_repo
            </a>
          </div>
          <div className="flex flex-wrap gap-5 font-mono text-[11px] text-muted">
            <span>
              <span className="text-accent">●</span> agpl-3.0 server
            </span>
            <span>
              <span className="text-accent">●</span> mit sdk + cli
            </span>
            <span>
              <span className="text-accent">●</span> zero telemetry
            </span>
            <span>
              <span className="text-accent">●</span> no backdoor
            </span>
          </div>
        </div>

        {/* Code panel: the deploy */}
        <div className="border border-rule-strong bg-surface font-mono text-[12.5px] leading-[1.65]">
          <div className="flex items-center justify-between border-b border-rule px-4 py-2.5 text-[11px] uppercase tracking-[0.1em] text-muted">
            <span>
              <span className="text-accent">├&nbsp;</span>
              <span className="text-text">deploy.sh</span>
            </span>
            <span>
              <span className="text-accent">$</span> two deploys, ten minutes
            </span>
          </div>
          <pre className="overflow-x-auto p-5 whitespace-pre">
            <code>
              <span className="text-muted">{"# clone + install"}</span>
              {"\n"}
              <span className="text-text">git clone https://github.com/akshitkrnagpal/edgepush.git</span>
              {"\n"}
              <span className="text-text">cd edgepush && pnpm install</span>
              {"\n\n"}
              <span className="text-muted">{"# create cloudflare resources"}</span>
              {"\n"}
              <span className="text-text">cd apps/api</span>
              {"\n"}
              <span className="text-text">pnpm wrangler d1 create edgepush</span>
              {"\n"}
              <span className="text-text">pnpm wrangler kv namespace create edgepush-cache</span>
              {"\n"}
              <span className="text-text">pnpm wrangler queues create edgepush-dispatch</span>
              {"\n"}
              <span className="text-text">pnpm wrangler queues create edgepush-dispatch-dlq</span>
              {"\n\n"}
              <span className="text-muted">{"# paste IDs into wrangler.jsonc, then:"}</span>
              {"\n"}
              <span className="text-text">pnpm wrangler secret put ENCRYPTION_KEY</span>
              {"\n"}
              <span className="text-text">pnpm wrangler secret put BETTER_AUTH_SECRET</span>
              {"\n"}
              <span className="text-text">pnpm wrangler secret put GITHUB_CLIENT_ID</span>
              {"\n"}
              <span className="text-text">pnpm wrangler secret put GITHUB_CLIENT_SECRET</span>
              {"\n\n"}
              <span className="text-muted">{"# migrate + deploy api"}</span>
              {"\n"}
              <span className="text-text">pnpm db:migrate:remote</span>
              {"\n"}
              <span className="text-text">pnpm deploy</span>
              {"\n\n"}
              <span className="text-muted">{"# deploy dashboard"}</span>
              {"\n"}
              <span className="text-text">cd ../web && pnpm deploy</span>
              {"\n\n"}
              <span className="text-muted">{"# done. send your first push:"}</span>
              {"\n"}
              <span className="text-text">{`edgepush send <token> --title "from my own infra"`}</span>
            </code>
          </pre>
        </div>
      </section>

      {/* What you actually get */}
      <section className="mx-auto max-w-[1440px] border-t border-rule px-6 py-16">
        <div className="mb-8 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
          <span className="text-accent">─&nbsp;</span> what you actually get
        </div>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          <Principle
            title="HOSTED_MODE=false"
            body="A single env var that disables every hosted-tier behavior: no plan limits, no quota counter, no Stripe webhook, no retention purge, no operator digest emails. Self-host is a strict superset, not a stripped-down build."
          />
          <Principle
            title="your secret key"
            body="ENCRYPTION_KEY is a 32-byte secret you generate with openssl, store in wrangler secrets, and never share. Every APNs .p8 and FCM service account JSON is AES-GCM encrypted under that key before it touches D1."
          />
          <Principle
            title="your D1, your audit log"
            body="Every send, every receipt, every credential change writes to your own D1. Operator scripts (replay-dlq, inspect-app) ship in the repo so you can run incident response from your terminal."
          />
          <Principle
            title="active credential probes"
            body="The same hourly cron that runs on the hosted tier: probes every stored APNs and FCM credential against Apple and Google, marks them ● ok / ● broken / ● topic mismatch, emails you (if RESEND_API_KEY is set) when something breaks."
          />
          <Principle
            title="real workers infra"
            body="D1 + KV + Queues with DLQ + Durable Objects. No external dependencies. No nodejs containers. Cold start is sub-50ms because there is no cold start — it's all native Worker primitives."
          />
          <Principle
            title="MIT sdk + cli"
            body="The server is AGPL but @edgepush/sdk and @edgepush/cli are MIT. You can embed the SDK in a closed-source backend or mobile app without copyleft obligations."
          />
        </div>
      </section>

      {/* Versions / update notice */}
      <section className="mx-auto max-w-[1440px] border-t border-rule px-6 py-16">
        <div className="mb-8 flex items-baseline justify-between gap-4">
          <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
            <span className="text-accent">─&nbsp;</span> versions
          </div>
          <a
            href="https://github.com/akshitkrnagpal/edgepush/blob/main/CHANGELOG.md"
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted hover:text-text"
          >
            changelog →
          </a>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <VersionCard
            label="server + dashboard"
            version={CURRENT_VERSION}
            tag="v0.2 alpha"
            note="agpl-3.0. Track main for now; semver kicks in at v1.0."
            href="https://github.com/akshitkrnagpal/edgepush/releases"
          />
          <VersionCard
            label="@edgepush/sdk"
            version="0.2.0"
            tag="mit"
            note="Typed client. Works in any fetch-capable runtime."
            href="https://www.npmjs.com/package/@edgepush/sdk"
          />
          <VersionCard
            label="@edgepush/cli"
            version="0.2.0"
            tag="mit"
            note="login, send, receipt. Bundles the SDK inline."
            href="https://www.npmjs.com/package/@edgepush/cli"
          />
        </div>
        <p className="mt-6 max-w-2xl font-sans text-[14px] leading-[1.6] text-muted-strong">
          edgepush has no built-in update notifier. Watch the GitHub repo
          for releases or subscribe to the changelog feed if you want to
          know when there&apos;s something new to pull. Self-host upgrades are
          a `git pull` + `pnpm install` + `pnpm db:migrate:remote` +{" "}
          <span className="font-mono text-text">pnpm deploy</span>; the
          OPERATOR.md doc has a section on additive vs breaking migrations
          if you ever need to roll back.
        </p>
      </section>

      {/* Honest tradeoffs */}
      <section className="mx-auto max-w-[1440px] border-t border-rule px-6 py-16">
        <div className="mb-8 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
          <span className="text-accent">─&nbsp;</span> honest tradeoffs
        </div>
        <div className="grid grid-cols-1 gap-x-12 gap-y-8 md:grid-cols-2">
          <FaqItem
            q="What does AGPL-3.0 mean for me?"
            a="If you run edgepush as an internal service inside your company, AGPL is invisible — you don't have to do anything. AGPL only matters if you operate a hosted edgepush AS A SERVICE for third parties (like edgepush.dev does). In that case the AGPL requires you to publish any modifications you make to the server code. SDK + CLI are MIT, so they're unaffected."
          />
          <FaqItem
            q="Will my self-hosted instance get updates automatically?"
            a="No, by design. Self-host means you're in charge. You git pull when you want to upgrade. The hosted tier on edgepush.dev moves at its own pace; your fork moves at yours. The CHANGELOG and the GitHub releases page are how you find out what's new."
          />
          <FaqItem
            q="Is the self-hosted version a different product than the hosted one?"
            a="Same code. The only difference is HOSTED_MODE — false (self-host default) skips the billing and retention paths. Every other feature, including credential probes, dead-letter queue, dashboard, audit log, webhooks, is on by default."
          />
          <FaqItem
            q="What does it cost to run on Cloudflare?"
            a="For most teams, $0. Workers paid plan is $5/mo and unlocks the cron triggers + larger queue burst limits, but you can run on the free tier for trials. D1 + KV + Queues are all in-tier on free or paid. The biggest cost variable is Workers requests above 100K/day, which kicks in at $0.30 per million."
          />
          <FaqItem
            q="Can I migrate between self-host and the hosted tier?"
            a="One direction is easy, the other is manual. Self-host → hosted: sign up at edgepush.dev, re-upload credentials, switch your server's API URL. Hosted → self-host: follow the SELFHOST.md guide and re-upload credentials. There's no automated migration tool because both sides are storing native APNs and FCM tokens — your token list is portable by design."
          />
          <FaqItem
            q="What if I need help?"
            a="Open a GitHub issue. The hosted tier customers get priority email support; self-hosters get the same code, same docs, same operator runbook, but support is community-driven through issues. SELFHOST.md and OPERATOR.md cover the common failure modes."
          />
        </div>
      </section>

      {/* CTA band */}
      <section className="mx-auto max-w-[1440px] px-6 py-20">
        <div className="border border-rule-strong bg-surface px-8 py-16 sm:px-16">
          <div className="mb-4 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
            <span className="text-accent">$&nbsp;</span> ready_to_clone
          </div>
          <h2 className="mb-4 max-w-2xl font-mono text-3xl font-bold leading-[1.05] tracking-[-0.02em] text-text sm:text-4xl">
            Run edgepush on{" "}
            <span className="text-accent">your infrastructure</span>.
          </h2>
          <p className="mb-8 max-w-xl font-sans text-[16px] text-muted-strong">
            SELFHOST.md walks the full path: prerequisites, resource creation,
            secrets, migrations, first sign-in, smoke test, troubleshooting.
            About 20 minutes if you&apos;ve used Cloudflare Workers before.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="https://github.com/akshitkrnagpal/edgepush/blob/main/SELFHOST.md"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-none bg-text px-5 py-3 font-mono text-[12px] font-semibold text-black hover:bg-accent"
            >
              <span className="text-accent">$</span> read_selfhost_md
            </a>
            <a
              href="https://github.com/akshitkrnagpal/edgepush"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-none border border-rule-strong px-5 py-3 font-mono text-[12px] font-semibold text-text hover:border-text"
            >
              <GithubMark />
              star_on_github
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mx-auto grid max-w-[1440px] grid-cols-1 gap-10 border-t border-rule px-6 py-12 font-mono text-[11px] text-muted sm:grid-cols-[1fr_auto_auto_auto]">
        <div className="flex items-start gap-3">
          <LogoMark />
          <div>
            <p className="text-text">edgepush · self-host</p>
            <p className="mt-1">
              &copy; {new Date().getFullYear()} · server agpl-3.0 · sdk + cli mit
            </p>
            <p className="mt-1">v{CURRENT_VERSION} · alpha</p>
          </div>
        </div>
        <FooterColumn title="docs">
          <FooterLink
            href="https://github.com/akshitkrnagpal/edgepush/blob/main/SELFHOST.md"
            external
          >
            self-host guide
          </FooterLink>
          <FooterLink
            href="https://github.com/akshitkrnagpal/edgepush/blob/main/OPERATOR.md"
            external
          >
            operator runbook
          </FooterLink>
          <FooterLink
            href="https://github.com/akshitkrnagpal/edgepush/blob/main/CHANGELOG.md"
            external
          >
            changelog
          </FooterLink>
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
          <FooterLink href="/">hosted</FooterLink>
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

function VersionCard({
  label,
  version,
  tag,
  note,
  href,
}: {
  label: string;
  version: string;
  tag: string;
  note: string;
  href: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="block border border-rule-strong bg-surface p-6 hover:border-text"
    >
      <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
        <span className="text-accent">├&nbsp;</span>
        {label}
      </div>
      <div className="mb-1 flex items-baseline gap-3">
        <span className="font-mono text-[28px] font-extrabold leading-none text-text">
          {version}
        </span>
        <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
          {tag}
        </span>
      </div>
      <p className="mt-3 font-sans text-[13px] leading-[1.55] text-muted-strong">
        {note}
      </p>
    </a>
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
