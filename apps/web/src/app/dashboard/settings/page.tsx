"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";

export default function SettingsPage() {
  const router = useRouter();
  const { data: session } = authClient.useSession();

  const [name, setName] = useState(session?.user.name ?? "");

  const [profileStatus, setProfileStatus] = useState<string | null>(null);
  const [deleteStatus, setDeleteStatus] = useState<string | null>(null);

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileStatus(null);
    try {
      const result = await authClient.updateUser({ name });
      if (result.error) {
        setProfileStatus(`Error: ${result.error.message ?? "failed"}`);
        return;
      }
      setProfileStatus("Saved");
    } catch (err) {
      setProfileStatus(
        `Error: ${err instanceof Error ? err.message : "failed"}`,
      );
    }
  }

  async function handleDeleteAccount() {
    if (
      !confirm(
        "Are you sure? This deletes your account, all apps, credentials, and messages. This cannot be undone.",
      )
    ) {
      return;
    }
    setDeleteStatus(null);
    try {
      const result = await authClient.deleteUser({});
      if (result.error) {
        setDeleteStatus(`Error: ${result.error.message ?? "failed"}`);
        return;
      }
      router.replace("/");
    } catch (err) {
      setDeleteStatus(
        `Error: ${err instanceof Error ? err.message : "failed"}`,
      );
    }
  }

  if (!session) return null;

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-semibold mb-2">Account settings</h1>
      <p className="text-sm text-zinc-500 mb-12">
        Signed in as {session.user.email}
      </p>

      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4">Profile</h2>
        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-2">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm focus:outline-none focus:border-white/30"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-2">
              Email
            </label>
            <input
              type="email"
              value={session.user.email}
              disabled
              className="w-full rounded-lg border border-white/10 bg-white/[0.02] px-4 py-2 text-sm text-zinc-500 cursor-not-allowed"
            />
          </div>
          {profileStatus && (
            <p
              className={
                profileStatus.startsWith("Error")
                  ? "text-sm text-red-400"
                  : "text-sm text-emerald-300"
              }
            >
              {profileStatus}
            </p>
          )}
          <button
            type="submit"
            className="rounded-lg bg-white text-black px-4 py-2 text-sm font-medium hover:bg-zinc-200"
          >
            Save profile
          </button>
        </form>
      </section>

      <section className="border-t border-red-400/20 pt-8">
        <h2 className="text-xl font-semibold mb-2 text-red-300">Danger zone</h2>
        <p className="text-sm text-zinc-500 mb-4">
          Permanently delete your account and all associated apps,
          credentials, and messages. This cannot be undone.
        </p>
        {deleteStatus && (
          <p className="text-sm text-red-400 mb-3">{deleteStatus}</p>
        )}
        <button
          onClick={handleDeleteAccount}
          className="rounded-lg border border-red-400/40 text-red-300 px-4 py-2 text-sm font-medium hover:bg-red-400/10"
        >
          Delete account
        </button>
      </section>
    </div>
  );
}
