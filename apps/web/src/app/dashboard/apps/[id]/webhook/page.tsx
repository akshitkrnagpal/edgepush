"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";

import { api } from "@/lib/api";

export default function WebhookPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(props.params);
  const [url, setUrl] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSecret, setSavedSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getWebhook(id)
      .then((webhook) => {
        if (webhook) {
          setUrl(webhook.url);
          setEnabled(webhook.enabled);
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const result = await api.upsertWebhook(id, { url, enabled });
      if (result.secret) {
        setSavedSecret(result.secret);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save webhook");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this webhook? You'll lose the signing secret.")) return;
    try {
      await api.deleteWebhook(id);
      setUrl("");
      setEnabled(true);
      setSavedSecret(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete webhook");
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

      <h1 className="text-3xl font-semibold mb-2">Webhook</h1>
      <p className="text-sm text-zinc-500 mb-8">
        Get notified when push messages are delivered or fail. edgepush POSTs
        a signed JSON payload to your URL for every status change.
      </p>

      {savedSecret && (
        <div className="border border-emerald-400/30 bg-emerald-400/5 rounded-xl p-6 mb-8">
          <h3 className="font-semibold text-emerald-300 mb-2">
            Copy your signing secret now
          </h3>
          <p className="text-sm text-zinc-400 mb-4">
            Use this to verify webhook requests. It&apos;s only shown once.
          </p>
          <div className="bg-black rounded-lg p-4 font-mono text-sm break-all mb-4">
            {savedSecret}
          </div>
          <button
            onClick={() => navigator.clipboard.writeText(savedSecret)}
            className="text-sm underline underline-offset-4"
          >
            Copy
          </button>
          <button
            onClick={() => setSavedSecret(null)}
            className="text-sm underline underline-offset-4 ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-zinc-500">Loading...</p>
      ) : (
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-2">
              Webhook URL
            </label>
            <input
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-mono focus:outline-none focus:border-white/30"
              placeholder="https://api.myapp.com/edgepush/webhook"
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="enabled"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
            <label htmlFor="enabled" className="text-sm text-zinc-400">
              Enabled
            </label>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex items-center gap-3 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-white text-black px-4 py-2 text-sm font-medium hover:bg-zinc-200 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
            {url && (
              <button
                type="button"
                onClick={handleDelete}
                className="text-sm text-red-400 hover:text-red-300"
              >
                Delete
              </button>
            )}
          </div>
        </form>
      )}

      <div className="mt-12 border-t border-white/5 pt-8">
        <h2 className="text-lg font-semibold mb-3">Verifying signatures</h2>
        <p className="text-sm text-zinc-400 mb-4">
          Every webhook request includes an{" "}
          <code className="text-xs bg-white/5 px-1.5 py-0.5 rounded">
            X-Edgepush-Signature
          </code>{" "}
          header with the format{" "}
          <code className="text-xs bg-white/5 px-1.5 py-0.5 rounded">
            sha256=&lt;base64&gt;
          </code>
          . Verify it with HMAC-SHA256 using your signing secret:
        </p>
        <pre className="bg-black/50 border border-white/5 rounded-xl p-4 overflow-x-auto text-xs">
          <code className="font-mono text-zinc-300">{`import { createHmac } from "node:crypto";

const signature = req.headers["x-edgepush-signature"]; // "sha256=..."
const expected = createHmac("sha256", EDGEPUSH_WEBHOOK_SECRET)
  .update(req.rawBody)
  .digest("base64");

if (signature !== \`sha256=\${expected}\`) {
  return res.status(401).end();
}`}</code>
        </pre>
      </div>
    </div>
  );
}
