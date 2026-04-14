/**
 * App root page.
 *
 * Behavior depends on the deployment mode:
 * - Hosted (app.edgepush.dev, HOSTED_MODE=true): redirects to /sign-in
 *   for guests and /dashboard for logged-in users. There is no homepage
 *   on the hosted SaaS; visitors go straight to auth.
 * - Self-hosted / demo (HOSTED_MODE=false): shows the self-host welcome
 *   page with version info, links to docs, dashboard, and the cloud
 *   version.
 *
 * Since we can't read env vars at build time in a server component
 * (HOSTED_MODE is a wrangler runtime var), this page renders the
 * self-host welcome as the default and the middleware handles the
 * hosted redirect.
 */

import Link from "next/link";

import { HealthStatus } from "@/components/health-status";
import { CURRENT_VERSION } from "@/lib/version";

export const metadata = {
  title: "edgepush",
  description:
    "Your edgepush instance. Open source push notifications for iOS and Android.",
};

export default function AppRootPage() {
  // This page is shown for self-hosted / demo deployments.
  // Hosted (app.edgepush.dev) visitors are redirected by middleware
  // before reaching this component.
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-20 font-sans">
      <div className="w-full max-w-[520px]">
        {/* Logo + version */}
        <div className="mb-12 text-center">
          <div className="mb-4 inline-flex items-center justify-center">
            <span className="relative flex h-[44px] w-[44px] items-center justify-center border border-accent font-mono text-[18px] font-extrabold text-accent">
              ep
              <span className="absolute -left-[2px] -top-[2px] h-[4px] w-[4px] bg-accent" />
              <span className="absolute -right-[2px] -bottom-[2px] h-[4px] w-[4px] bg-accent" />
            </span>
          </div>
          <h1 className="mb-2 font-mono text-[28px] font-extrabold tracking-[-0.02em] text-text">
            edgepush
          </h1>
          <p className="font-mono text-[12px] uppercase tracking-[0.12em] text-muted">
            self-hosted · v{CURRENT_VERSION} · <HealthStatus />
          </p>
        </div>

        {/* Quick links */}
        <div className="mb-10 grid grid-cols-2 gap-3">
          <QuickLink href="/dashboard" label="dashboard" description="manage apps + credentials" />
          <QuickLink href="/sign-in" label="sign in" description="github oauth" />
          <QuickLink href="https://edgepush.dev/docs" label="docs" description="18 sections, full reference" external />
          <QuickLink href="https://edgepush.dev" label="cloud version" description="hosted at edgepush.dev" external />
        </div>

        {/* Version info */}
        <div className="mb-10 border border-rule-strong bg-surface">
          <div className="border-b border-rule px-5 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
            <span className="text-accent">├&nbsp;</span> versions
          </div>
          <div className="divide-y divide-rule">
            <VersionRow label="server" version={CURRENT_VERSION} href="https://github.com/akshitkrnagpal/edgepush/releases" />
            <VersionRow label="@edgepush/sdk" version="1.0.0" href="https://www.npmjs.com/package/@edgepush/sdk" />
            <VersionRow label="@edgepush/cli" version="1.0.0" href="https://www.npmjs.com/package/@edgepush/cli" />
          </div>
        </div>

        {/* External links */}
        <div className="mb-10 flex flex-wrap justify-center gap-4 font-mono text-[11px] uppercase tracking-[0.12em]">
          <ExtLink href="https://github.com/akshitkrnagpal/edgepush">github</ExtLink>
          <ExtLink href="https://github.com/akshitkrnagpal/edgepush/blob/main/SELFHOST.md">self-host guide</ExtLink>
          <ExtLink href="https://github.com/akshitkrnagpal/edgepush/blob/main/CHANGELOG.md">changelog</ExtLink>
          <ExtLink href="https://github.com/akshitkrnagpal/edgepush/releases">check for updates</ExtLink>
        </div>

        {/* Footer */}
        <div className="text-center font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
          <p>
            server agpl-3.0 · sdk + cli mit ·{" "}
            <a href="https://edgepush.dev" target="_blank" rel="noopener noreferrer" className="text-accent hover:text-accent-hover">
              edgepush.dev
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}

function QuickLink({ href, label, description, external }: { href: string; label: string; description: string; external?: boolean }) {
  const Tag = external ? "a" : Link;
  const extra = external ? { target: "_blank" as const, rel: "noopener noreferrer" } : {};
  return (
    <Tag href={href} className="block border border-rule-strong bg-surface px-5 py-4 hover:border-text" {...extra}>
      <div className="mb-1 font-mono text-[13px] font-bold text-text">{label}</div>
      <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">{description}</div>
    </Tag>
  );
}

function VersionRow({ label, version, href }: { label: string; version: string; href: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between px-5 py-3 hover:bg-surface-2">
      <span className="font-mono text-[12px] text-muted-strong">{label}</span>
      <span className="font-mono text-[12px] font-bold text-text">{version}</span>
    </a>
  );
}

function ExtLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-muted hover:text-text">
      {children}
    </a>
  );
}
