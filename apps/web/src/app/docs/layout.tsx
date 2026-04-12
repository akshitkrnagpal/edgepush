import Link from "next/link";
import type { Metadata } from "next";

import { Sidebar } from "./sidebar";

export const metadata: Metadata = {
  title: "edgepush docs",
  description:
    "Send push notifications to iOS and Android with a single API. Full reference for the SDK, CLI, REST API, webhooks, error codes, and self-hosting.",
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
        <Sidebar />
        <div>{children}</div>
      </div>
    </main>
  );
}
