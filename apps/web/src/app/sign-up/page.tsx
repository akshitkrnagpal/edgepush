"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await authClient.signUp.email({
        name,
        email,
        password,
      });
      if (result.error) {
        setError(result.error.message ?? "Sign up failed");
        return;
      }
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed");
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

        <h1 className="text-3xl font-semibold mb-2">Create account</h1>
        <p className="text-sm text-zinc-400 mb-8">
          Already have an account?{" "}
          <Link
            href="/sign-in"
            className="text-zinc-200 underline underline-offset-4 hover:text-white"
          >
            Sign in
          </Link>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-2">
              Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm focus:outline-none focus:border-white/30"
            />
          </div>

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

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-2">
              Password
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm focus:outline-none focus:border-white/30"
              placeholder="at least 8 characters"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-white text-black px-4 py-2.5 text-sm font-medium hover:bg-zinc-200 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create account"}
          </button>
        </form>
      </div>
    </main>
  );
}
