"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { authClient } from "@/lib/auth-client";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
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
      <main className="flex-1 flex items-center justify-center">
        <p className="text-sm text-zinc-500">Loading...</p>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col">
      <nav className="border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-lg font-semibold">
            edgepush
          </Link>
          <Link
            href="/dashboard"
            className="text-sm text-zinc-400 hover:text-zinc-200"
          >
            Apps
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-zinc-500">{session.user.email}</span>
          <button
            onClick={handleSignOut}
            className="text-sm text-zinc-400 hover:text-zinc-200"
          >
            Sign out
          </button>
        </div>
      </nav>
      <div className="flex-1">{children}</div>
    </main>
  );
}
