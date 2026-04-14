"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { QueryProvider } from "@/components/query-provider";
import { ToastProvider } from "@/components/toast";
import { authClient } from "@/lib/auth-client";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (!isPending && !session) {
      router.replace("/sign-in");
    }
  }, [session, isPending, router]);

  async function handleSignOut() {
    await authClient.signOut();
    router.replace("/");
  }

  if (isPending || !session) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="font-mono text-[12px] text-muted">
          <span className="text-accent">●</span> loading session…
        </p>
      </main>
    );
  }

  const isApps = pathname === "/dashboard" || pathname.startsWith("/dashboard/apps");
  const isSettings = pathname.startsWith("/dashboard/settings");

  return (
    <QueryProvider>
      <ToastProvider>
        <main className="flex flex-1 flex-col font-sans">
          <nav className="flex items-center justify-between border-b border-rule px-6 py-4">
            <div className="flex items-center gap-7">
              <Link
                href="/dashboard"
                className="flex items-center gap-2.5 font-mono text-[15px] font-bold text-text"
              >
                <span className="relative flex h-[22px] w-[22px] items-center justify-center border border-accent font-mono text-[11px] font-extrabold text-accent">
                  ep
                </span>
                edgepush
              </Link>
              <ul className="flex items-center gap-5 font-mono text-[12px] uppercase tracking-[0.1em]">
                <li>
                  <Link
                    href="/dashboard"
                    className={isApps ? "text-text" : "text-muted hover:text-text"}
                  >
                    {isApps && <span className="text-accent">├&nbsp;</span>}
                    apps
                  </Link>
                </li>
                <li>
                  <Link
                    href="/dashboard/settings"
                    className={
                      isSettings ? "text-text" : "text-muted hover:text-text"
                    }
                  >
                    {isSettings && <span className="text-accent">├&nbsp;</span>}
                    settings
                  </Link>
                </li>
              </ul>
            </div>
            <div className="flex items-center gap-4 font-mono text-[11px]">
              <span className="hidden text-muted sm:inline">
                <span className="text-accent">●</span> {session.user.email}
              </span>
              <button
                onClick={handleSignOut}
                className="rounded-none border border-rule-strong px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-text hover:border-text"
              >
                sign_out
              </button>
            </div>
          </nav>
          <div className="flex-1">{children}</div>
        </main>
      </ToastProvider>
    </QueryProvider>
  );
}
