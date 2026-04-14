"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { authClient } from "@/lib/auth-client";

/**
 * CLI OAuth authorization page.
 *
 * Flow:
 * 1. CLI starts a local HTTP server and opens this page with ?port=N
 * 2. If user is not signed in, redirects to GitHub OAuth
 * 3. After sign-in, fetches a session token via /api/cli-token
 * 4. Redirects to http://localhost:N/callback?token=...
 */

const baseURL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";

export default function CliAuthPage() {
  return (
    <Suspense
      fallback={
        <main className="flex flex-1 items-center justify-center px-6 py-20">
          <p className="font-mono text-[12px] text-muted">
            <span className="text-accent">●</span> loading...
          </p>
        </main>
      }
    >
      <CliAuthInner />
    </Suspense>
  );
}

function CliAuthInner() {
  const searchParams = useSearchParams();
  const port = searchParams.get("port");

  const { data: session, isPending } = authClient.useSession();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (!isPending && !session) {
      authClient.signIn.social({
        provider: "github",
        callbackURL: `/cli/auth?port=${port}`,
      });
    }
  }, [session, isPending, port]);

  // Once authenticated, fetch session token and redirect to CLI
  useEffect(() => {
    if (!session || !port || done) return;

    fetch(`${baseURL}/api/cli-token`, { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json();
      })
      .then((r: { token: string }) => {
        setDone(true);
        window.location.href = `http://localhost:${port}/callback?token=${encodeURIComponent(r.token)}&base_url=${encodeURIComponent(baseURL)}`;
      })
      .catch(() => setError("Failed to get session token"));
  }, [session, port, done]);

  if (!port) {
    return (
      <main className="flex flex-1 items-center justify-center px-6 py-20 font-sans">
        <div className="w-full max-w-[420px] border border-rule-strong bg-surface p-8">
          <p className="font-mono text-[12px] text-error">
            <span>●</span> missing ?port parameter. Run{" "}
            <code className="text-text">edgepush login</code> from your terminal.
          </p>
        </div>
      </main>
    );
  }

  if (done) {
    return (
      <main className="flex flex-1 items-center justify-center px-6 py-20">
        <div className="w-full max-w-[420px] border border-rule-strong bg-surface p-8">
          <p className="font-mono text-[12px] text-text">
            <span className="text-accent">●</span> CLI authorized. You can close
            this tab.
          </p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex flex-1 items-center justify-center px-6 py-20">
        <div className="w-full max-w-[420px] border border-rule-strong bg-surface p-8">
          <div className="border border-error px-3 py-2 font-mono text-[12px] text-error">
            <span>●</span> {error}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-20">
      <p className="font-mono text-[12px] text-muted">
        <span className="text-accent">●</span> authorizing CLI...
      </p>
    </main>
  );
}
