"use client";

/**
 * Pricing page for edgepush.
 *
 * DESIGN.md compliance notes:
 * - Hero headline is the shell-prompt voice per the approved design spec
 *   in the /office-hours doc: "$ edgepush --pricing" in JetBrains Mono 800
 *   at display-2xl size.
 * - Three tiers in 1px-rule boxes, Pro differentiated ONLY by accent
 *   border color — no drop shadow, no "popular" sticker, no border-left
 *   trick. DESIGN.md line 189-197 forbids all of those.
 * - Status dots use the `●` / `○` text characters (not SVG icons).
 * - CTAs read like shell prompts: `$ sign_in_with_github`,
 *   `$ upgrade_to_pro`, `$ wrangler_deploy`.
 * - No marketing fluff copy. No "unlock", "seamless", "best-in-class",
 *   etc. Feature lines are facts, not sell copy.
 */

import Link from "next/link";
import { useState } from "react";

import { useCreateCheckout } from "@/lib/queries";

export default function PricingPage() {
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const checkout = useCreateCheckout();

  async function handleUpgrade() {
    setCheckoutError(null);
    try {
      const result = await checkout.mutateAsync();
      window.location.href = result.url;
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : "checkout failed");
    }
  }

  return (
    <div className="min-h-screen">
      {/* Top nav — minimal. Matches the rest of the marketing surfaces. */}
      <nav className="border-b border-rule px-6 py-5">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between">
          <Link
            href="/"
            className="font-mono text-[14px] font-bold tracking-[-0.01em] text-text"
          >
            <span className="text-accent">●&nbsp;</span>
            edgepush
          </Link>
          <div className="flex items-center gap-6 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
            <Link href="/docs" className="hover:text-text">
              docs
            </Link>
            <Link href="/pricing" className="text-accent">
              ├ pricing
            </Link>
            <Link href="/sign-in" className="hover:text-text">
              sign_in
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 pb-16 pt-24 md:pb-24 md:pt-32">
        <div className="mx-auto max-w-[1440px]">
          <h1 className="mb-6 font-mono text-[clamp(56px,9vw,132px)] font-extrabold leading-[0.9] tracking-[-0.045em] text-text">
            $ edgepush --pricing
          </h1>
          <p className="max-w-[640px] font-sans text-[18px] leading-[1.55] text-muted-strong">
            One honest price. Self-host if you&apos;d rather. No seat fees,
            no usage traps.
          </p>
        </div>
      </section>

      {/* Tier grid */}
      <section className="px-6 pb-16">
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Free */}
          <TierCard
            name="free"
            price="$0"
            tagline="edgepush.dev hosted trial"
            featured={false}
            features={[
              "1 app",
              "10,000 events / month",
              "7-day log retention",
              "community support",
              "credential health probes",
              "webhook deliveries",
            ]}
            cta={{
              label: "$ sign_in_with_github",
              href: "/sign-in",
              external: false,
            }}
          />

          {/* Pro — featured via accent border ONLY */}
          <TierCard
            name="pro"
            price="$29"
            priceSuffix="/mo"
            tagline="for indie shippers running a few apps"
            featured={true}
            features={[
              "3 apps",
              "50,000 events / month",
              "14-day log retention",
              "priority email support from the operator",
              "credential health probes (hosted)",
              "webhook deliveries",
            ]}
            cta={{
              label: checkout.isPending
                ? "$ redirecting…"
                : "$ upgrade_to_pro",
              onClick: handleUpgrade,
              disabled: checkout.isPending,
            }}
            footnote={
              checkoutError ? (
                <p className="mt-4 font-mono text-[11px] text-accent">
                  <span>●</span> {checkoutError}
                </p>
              ) : null
            }
          />

          {/* Self-host */}
          <TierCard
            name="self-host"
            price="$0"
            tagline="agpl-3.0 — run it on your own cloudflare account"
            featured={false}
            features={[
              "unlimited apps",
              "unlimited events",
              "your retention, your rules",
              "same source — no gated features",
              "byo credentials, resend, stripe",
              "one `wrangler deploy`",
            ]}
            cta={{
              label: "$ wrangler_deploy",
              href: "https://github.com/akshitkrnagpal/edgepush#self-host",
              external: true,
            }}
          />
        </div>
      </section>

      {/* Feature comparison table */}
      <section className="px-6 pb-20">
        <div className="mx-auto max-w-[1200px]">
          <div className="mb-4 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
            <span className="text-accent">─&nbsp;</span>feature_comparison
          </div>
          <div className="overflow-x-auto border border-rule-strong bg-surface">
            <table className="w-full font-mono text-[12px] tnum">
              <thead>
                <tr className="border-b border-rule bg-[#050505] text-left text-[10px] uppercase tracking-[0.12em] text-muted">
                  <th className="px-4 py-3 font-medium">feature</th>
                  <th className="px-4 py-3 font-medium">free</th>
                  <th className="px-4 py-3 font-medium text-accent">pro</th>
                  <th className="px-4 py-3 font-medium">self-host</th>
                </tr>
              </thead>
              <tbody>
                <ComparisonRow
                  feature="apps"
                  free="1"
                  pro="3"
                  selfHost="unlimited"
                />
                <ComparisonRow
                  feature="events / month"
                  free="10,000"
                  pro="50,000"
                  selfHost="unlimited"
                />
                <ComparisonRow
                  feature="log retention"
                  free="7 days"
                  pro="14 days"
                  selfHost="your rules"
                />
                <ComparisonRow
                  feature="credential health probes"
                  free="✓"
                  pro="✓"
                  selfHost="✓ (you run it)"
                />
                <ComparisonRow
                  feature="delivery webhooks"
                  free="✓"
                  pro="✓"
                  selfHost="✓"
                />
                <ComparisonRow
                  feature="priority email support"
                  free="—"
                  pro="24h best effort"
                  selfHost="—"
                />
                <ComparisonRow
                  feature="license"
                  free="agpl-3.0"
                  pro="agpl-3.0"
                  selfHost="agpl-3.0"
                  last
                />
              </tbody>
            </table>
          </div>

          <p className="mt-6 font-mono text-[11px] text-muted">
            <span className="text-accent">●</span> over-quota: email
            hello@edgepush.dev, we&apos;ll sort it out.
          </p>
          <p className="mt-2 font-mono text-[11px] text-muted">
            <span className="text-accent">●</span> need a commercial license
            (no agpl)? hello@edgepush.dev
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-rule px-6 py-8">
        <div className="mx-auto max-w-[1440px] font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
          <span className="text-accent">●&nbsp;</span>
          open source · agpl-3.0 server · mit sdk · self-host or let us run it
        </div>
      </footer>
    </div>
  );
}

type CtaLink = {
  label: string;
  href: string;
  external: boolean;
  onClick?: undefined;
  disabled?: undefined;
};

type CtaButton = {
  label: string;
  onClick: () => void;
  disabled: boolean;
  href?: undefined;
  external?: undefined;
};

function TierCard({
  name,
  price,
  priceSuffix,
  tagline,
  featured,
  features,
  cta,
  footnote,
}: {
  name: string;
  price: string;
  priceSuffix?: string;
  tagline: string;
  featured: boolean;
  features: string[];
  cta: CtaLink | CtaButton;
  footnote?: React.ReactNode;
}) {
  const border = featured ? "border-accent" : "border-rule-strong";

  return (
    <div className={`flex flex-col bg-surface p-6 ${border} border`}>
      <div className="mb-6">
        <div className="mb-4 font-mono text-[10px] uppercase tracking-[0.14em] text-accent">
          ├&nbsp;{name}
        </div>
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[32px] font-bold leading-[1.05] tracking-[-0.02em] text-text">
            {price}
          </span>
          {priceSuffix && (
            <span className="font-sans text-[13px] text-muted">
              {priceSuffix}
            </span>
          )}
        </div>
        <p className="mt-2 font-sans text-[13px] leading-[1.5] text-muted-strong">
          {tagline}
        </p>
      </div>

      <ul className="mb-6 flex-1 space-y-0 border-t border-rule">
        {features.map((f) => (
          <li
            key={f}
            className="border-b border-rule py-3 font-mono text-[11px] uppercase tracking-[0.08em] text-muted-strong"
          >
            <span className="text-accent">●&nbsp;</span>
            {f}
          </li>
        ))}
      </ul>

      {"href" in cta ? (
        <Link
          href={cta.href!}
          target={cta.external ? "_blank" : undefined}
          rel={cta.external ? "noopener noreferrer" : undefined}
          className={
            featured
              ? "inline-flex items-center justify-center gap-2 rounded-none bg-accent px-4 py-3 font-mono text-[12px] font-semibold text-black hover:bg-accent-hover"
              : "inline-flex items-center justify-center gap-2 rounded-none bg-text px-4 py-3 font-mono text-[12px] font-semibold text-black hover:bg-accent"
          }
        >
          {cta.label}
        </Link>
      ) : (
        <button
          onClick={cta.onClick}
          disabled={cta.disabled}
          className={
            featured
              ? "inline-flex items-center justify-center gap-2 rounded-none bg-accent px-4 py-3 font-mono text-[12px] font-semibold text-black hover:bg-accent-hover disabled:opacity-40"
              : "inline-flex items-center justify-center gap-2 rounded-none bg-text px-4 py-3 font-mono text-[12px] font-semibold text-black hover:bg-accent disabled:opacity-40"
          }
        >
          {cta.label}
        </button>
      )}

      {footnote}
    </div>
  );
}

function ComparisonRow({
  feature,
  free,
  pro,
  selfHost,
  last = false,
}: {
  feature: string;
  free: string;
  pro: string;
  selfHost: string;
  last?: boolean;
}) {
  return (
    <tr className={last ? "" : "border-b border-rule"}>
      <td className="px-4 py-3 font-mono text-[11px] uppercase tracking-[0.08em] text-muted-strong">
        {feature}
      </td>
      <td className="px-4 py-3 text-muted-strong">{free}</td>
      <td className="px-4 py-3 text-text">{pro}</td>
      <td className="px-4 py-3 text-muted-strong">{selfHost}</td>
    </tr>
  );
}
