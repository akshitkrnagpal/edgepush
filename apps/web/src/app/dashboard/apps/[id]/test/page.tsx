"use client";

import Link from "next/link";
import { use, useState } from "react";

import { api } from "@/lib/api";

export default function TestPushPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(props.params);
  const [to, setTo] = useState("");
  const [platform, setPlatform] = useState<"ios" | "android" | "">("");
  const [title, setTitle] = useState("Test push from edgepush");
  const [body, setBody] = useState(
    "If you received this, your setup is working correctly.",
  );
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setSending(true);
    try {
      const r = await api.sendTestPush(id, {
        to,
        platform: platform === "" ? undefined : platform,
        title,
        body,
      });
      setResult(r.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSending(false);
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

      <h1 className="text-3xl font-semibold mb-2">Send test push</h1>
      <p className="text-sm text-zinc-500 mb-8">
        Paste a device token to verify your APNs or FCM credentials are
        working. The message is dispatched through the same queue as
        production sends.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-2">
            Device token
          </label>
          <textarea
            required
            value={to}
            onChange={(e) => setTo(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-mono focus:outline-none focus:border-white/30"
            placeholder="APNs hex token or FCM registration token"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-2">
            Platform
          </label>
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value as "" | "ios" | "android")}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm focus:outline-none focus:border-white/30"
          >
            <option value="">Auto-detect</option>
            <option value="ios">iOS (APNs)</option>
            <option value="android">Android (FCM)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-2">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm focus:outline-none focus:border-white/30"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-2">
            Body
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm focus:outline-none focus:border-white/30"
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        {result && (
          <div className="border border-emerald-400/30 bg-emerald-400/5 rounded-lg p-4">
            <p className="text-sm text-emerald-300">
              Queued. Ticket id: <code className="font-mono">{result}</code>
            </p>
            <Link
              href={`/dashboard/apps/${id}/messages`}
              className="text-sm underline underline-offset-4 mt-2 inline-block"
            >
              View send history &rarr;
            </Link>
          </div>
        )}

        <div className="flex items-center gap-3 pt-4">
          <button
            type="submit"
            disabled={sending || !to}
            className="rounded-lg bg-white text-black px-4 py-2 text-sm font-medium hover:bg-zinc-200 disabled:opacity-50"
          >
            {sending ? "Sending..." : "Send"}
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
