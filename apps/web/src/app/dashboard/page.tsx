"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { api } from "@/lib/api";

interface App {
  id: string;
  name: string;
  packageName: string;
  createdAt: number;
}

export default function DashboardPage() {
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [packageName, setPackageName] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    try {
      const result = await api.listApps();
      setApps(result.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreating(true);
    try {
      await api.createApp({ name, packageName });
      setName("");
      setPackageName("");
      setShowForm(false);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create app");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold">Apps</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Manage your push notification apps and API keys.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-white text-black px-4 py-2 text-sm font-medium hover:bg-zinc-200"
        >
          New app
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="border border-white/10 rounded-xl p-6 mb-8 bg-white/[0.02]"
        >
          <h2 className="font-semibold mb-4">Create app</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-2">
                Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm focus:outline-none focus:border-white/30"
                placeholder="My awesome app"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-2">
                Package name
              </label>
              <input
                type="text"
                required
                value={packageName}
                onChange={(e) => setPackageName(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-mono focus:outline-none focus:border-white/30"
                placeholder="io.akshit.myapp"
              />
              <p className="text-xs text-zinc-500 mt-2">
                Your bundle id (iOS) or package name (Android). Shown as the
                prefix in your API keys.
              </p>
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={creating}
                className="rounded-lg bg-white text-black px-4 py-2 text-sm font-medium hover:bg-zinc-200 disabled:opacity-50"
              >
                {creating ? "Creating..." : "Create"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-sm text-zinc-400 hover:text-zinc-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-zinc-500">Loading...</p>
      ) : apps.length === 0 ? (
        <div className="border border-dashed border-white/10 rounded-xl p-12 text-center">
          <p className="text-zinc-400 mb-4">No apps yet.</p>
          <button
            onClick={() => setShowForm(true)}
            className="text-sm text-zinc-200 underline underline-offset-4 hover:text-white"
          >
            Create your first app
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {apps.map((app) => (
            <Link
              key={app.id}
              href={`/dashboard/apps/${app.id}`}
              className="block border border-white/10 rounded-xl p-5 hover:border-white/20 hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{app.name}</h3>
                  <p className="text-sm text-zinc-500 font-mono mt-1">
                    {app.packageName}
                  </p>
                </div>
                <span className="text-xs text-zinc-500">
                  Created {new Date(app.createdAt).toLocaleDateString()}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
