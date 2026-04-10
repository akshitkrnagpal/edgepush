"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useState } from "react";

import { api } from "@/lib/api";

export default function FcmCredentialsPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(props.params);
  const router = useRouter();
  const [projectId, setProjectId] = useState("");
  const [serviceAccountJson, setServiceAccountJson] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      // Auto-extract project_id if the user just pastes the JSON
      if (!projectId && serviceAccountJson) {
        try {
          const parsed = JSON.parse(serviceAccountJson);
          if (parsed.project_id) setProjectId(parsed.project_id);
        } catch {
          // ignore
        }
      }

      await api.uploadFcm(id, {
        projectId:
          projectId ||
          (() => {
            try {
              return JSON.parse(serviceAccountJson).project_id ?? "";
            } catch {
              return "";
            }
          })(),
        serviceAccountJson,
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

      <h1 className="text-3xl font-semibold mb-2">FCM credentials</h1>
      <p className="text-sm text-zinc-500 mb-8">
        Upload your Firebase service account JSON. The file is encrypted with
        AES-GCM before being stored in D1. Project ID is auto-extracted.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-2">
            Project ID (optional, auto-extracted from JSON)
          </label>
          <input
            type="text"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-mono focus:outline-none focus:border-white/30"
            placeholder="my-firebase-project"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-2">
            Service account JSON
          </label>
          <textarea
            required
            value={serviceAccountJson}
            onChange={(e) => setServiceAccountJson(e.target.value)}
            rows={14}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-xs font-mono focus:outline-none focus:border-white/30"
            placeholder='{\n  "type": "service_account",\n  "project_id": "...",\n  ...\n}'
          />
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
