"use client";

import Link from "next/link";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await authClient.requestPasswordReset({
        email,
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (result.error) {
        setError(result.error.message ?? "Failed to send reset email");
        return;
      }
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <Link href="/" className="text-lg font-semibold block mb-8">
          edgepush
        </Link>

        <h1 className="text-3xl font-semibold mb-2">Reset password</h1>

        {sent ? (
          <div className="mt-6 border border-emerald-400/30 bg-emerald-400/5 rounded-lg p-5">
            <p className="text-sm text-emerald-300">
              If an account exists with that email, we&apos;ve sent a reset
              link. Check your inbox.
            </p>
            <Link
              href="/sign-in"
              className="text-sm underline underline-offset-4 mt-4 inline-block"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <p className="text-sm text-zinc-400 mb-8">
              Enter your email and we&apos;ll send you a link to reset your
              password.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm focus:outline-none focus:border-white/30"
                  placeholder="you@example.com"
                />
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-white text-black px-4 py-2.5 text-sm font-medium hover:bg-zinc-200 disabled:opacity-50"
              >
                {loading ? "Sending..." : "Send reset link"}
              </button>

              <p className="text-sm text-zinc-500 text-center pt-4">
                <Link
                  href="/sign-in"
                  className="text-zinc-300 underline underline-offset-4 hover:text-white"
                >
                  Back to sign in
                </Link>
              </p>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
