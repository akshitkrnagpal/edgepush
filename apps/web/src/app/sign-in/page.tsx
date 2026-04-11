"use client";

import Link from "next/link";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";

export default function SignInPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGitHubSignIn() {
    setError(null);
    setLoading(true);
    try {
      await authClient.signIn.social({
        provider: "github",
        // Absolute URL because Better Auth resolves relative URLs against
        // its own baseURL (the API host), not the dashboard origin.
        callbackURL: `${window.location.origin}/dashboard`,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-20 font-sans">
      <div className="w-full max-w-[420px] border border-rule-strong bg-surface">
        <div className="flex items-center justify-between border-b border-rule px-5 py-3 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
          <span>
            <span className="text-accent">├&nbsp;</span>
            <span className="text-text">auth / sign_in</span>
          </span>
          <span>
            <span className="text-accent">●</span> secure
          </span>
        </div>
        <div className="px-8 py-10">
          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-2 font-mono text-[14px] font-bold text-text"
          >
            <span className="relative flex h-[20px] w-[20px] items-center justify-center border border-accent font-mono text-[10px] font-extrabold text-accent">
              ep
            </span>
            edgepush
          </Link>

          <h1 className="mb-3 font-mono text-[32px] font-extrabold leading-[1.02] tracking-[-0.025em] text-text">
            sign in.
          </h1>
          <p className="mb-8 font-sans text-[15px] leading-[1.55] text-muted-strong">
            Sign in or create an account with your GitHub identity. No
            passwords, no email verification.
          </p>

          {error && (
            <div className="mb-5 border border-error px-3 py-2 font-mono text-[12px] text-error">
              <span>●</span> {error}
            </div>
          )}

          <button
            onClick={handleGitHubSignIn}
            disabled={loading}
            className="flex w-full items-center justify-center gap-3 rounded-none bg-text px-4 py-3 font-mono text-[12px] font-semibold text-black hover:bg-accent disabled:opacity-50"
          >
            <svg
              className="h-[18px] w-[18px]"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden
            >
              <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
            </svg>
            <span className="text-accent">$</span>{" "}
            {loading ? "redirecting..." : "continue_with_github"}
          </button>

          <p className="mt-8 text-center font-mono text-[10px] uppercase leading-[1.6] tracking-[0.1em] text-muted">
            by continuing you agree to our{" "}
            <Link href="/legal/terms" className="text-text hover:text-accent">
              terms
            </Link>
            {" & "}
            <Link
              href="/legal/privacy"
              className="text-text hover:text-accent"
            >
              privacy
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
