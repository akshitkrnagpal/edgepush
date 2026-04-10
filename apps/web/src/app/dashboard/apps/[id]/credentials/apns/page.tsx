"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useState } from "react";

import { api } from "@/lib/api";

export default function ApnsCredentialsPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(props.params);
  const router = useRouter();
  const [keyId, setKeyId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [bundleId, setBundleId] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [production, setProduction] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.uploadApns(id, {
        keyId,
        teamId,
        bundleId,
        privateKey,
        production,
      });
      router.push(`/dashboard/apps/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <Link
        href={`/dashboard/apps/${id}`}
        className="text-sm text-zinc-500 hover:text-zinc-200 mb-6 inline-block"
      >
        &larr; Back
      </Link>

      <h1 className="text-3xl font-semibold mb-2">APNs credentials</h1>
      <p className="text-sm text-zinc-500 mb-8">
        Upload your Apple Push Notification Service key. The .p8 file content
        is encrypted with AES-GCM before being stored in D1.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-2">
            Key ID
          </label>
          <input
            type="text"
            required
            value={keyId}
            onChange={(e) => setKeyId(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-mono focus:outline-none focus:border-white/30"
            placeholder="ABC1234567"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-2">
            Team ID
          </label>
          <input
            type="text"
            required
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-mono focus:outline-none focus:border-white/30"
            placeholder="DEF2345678"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-2">
            Bundle ID
          </label>
          <input
            type="text"
            required
            value={bundleId}
            onChange={(e) => setBundleId(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-mono focus:outline-none focus:border-white/30"
            placeholder="io.akshit.myapp"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-2">
            .p8 private key
          </label>
          <textarea
            required
            value={privateKey}
            onChange={(e) => setPrivateKey(e.target.value)}
            rows={10}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-xs font-mono focus:outline-none focus:border-white/30"
            placeholder={"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"}
          />
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="production"
            checked={production}
            onChange={(e) => setProduction(e.target.checked)}
          />
          <label htmlFor="production" className="text-sm text-zinc-400">
            Production environment (uncheck for sandbox)
          </label>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex items-center gap-3 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-white text-black px-4 py-2 text-sm font-medium hover:bg-zinc-200 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save credentials"}
          </button>
          <Link
            href={`/dashboard/apps/${id}`}
            className="text-sm text-zinc-400 hover:text-zinc-200"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
