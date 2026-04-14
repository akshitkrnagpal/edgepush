"use client";

import Link from "next/link";
import { use, useState } from "react";

import {
  useDeleteWebhook,
  useUpsertWebhook,
  useWebhook,
} from "@/lib/queries";

export default function WebhookPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(props.params);
  const webhook = useWebhook(id);

  return (
    <div className="mx-auto max-w-[780px] px-6 py-12">
      <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
        <Link href="/dashboard" className="hover:text-text">
          workspace / apps
        </Link>{" "}
        /{" "}
        <Link href={`/dashboard/apps/${id}`} className="hover:text-text">
          {id.slice(0, 8)}
        </Link>{" "}
        / <span className="text-text">webhook</span>
      </div>

      <h1 className="mb-2 font-mono text-[36px] font-extrabold leading-[1.02] tracking-[-0.025em] text-text">
        webhook.
      </h1>
      <p className="mb-10 font-sans text-[14px] leading-[1.55] text-muted-strong">
        Get notified when push messages are delivered or fail. edgepush POSTs a
        signed JSON payload to your URL for every status change.
      </p>

      {webhook.isLoading ? (
        <p className="font-mono text-[12px] text-muted">
          <span className="text-accent">●</span> loading…
        </p>
      ) : (
        <WebhookForm
          key={webhook.data?.url ?? "new"}
          id={id}
          initialUrl={webhook.data?.url ?? ""}
          initialEnabled={webhook.data?.enabled ?? true}
          initialExisted={!!webhook.data}
        />
      )}

      <SignatureSnippet />
    </div>
  );
}

function WebhookForm({
  id,
  initialUrl,
  initialEnabled,
  initialExisted,
}: {
  id: string;
  initialUrl: string;
  initialEnabled: boolean;
  initialExisted: boolean;
}) {
  const upsertWebhook = useUpsertWebhook(id);
  const deleteWebhook = useDeleteWebhook(id);
  const [url, setUrl] = useState(initialUrl);
  const [enabled, setEnabled] = useState(initialEnabled);
  const [exists, setExists] = useState(initialExisted);
  const [savedSecret, setSavedSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const result = await upsertWebhook.mutateAsync({ url, enabled });
      if (result.secret) {
        setSavedSecret(result.secret);
      }
      setExists(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save webhook");
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this webhook? You'll lose the signing secret."))
      return;
    try {
      await deleteWebhook.mutateAsync();
      setUrl("");
      setEnabled(true);
      setExists(false);
      setSavedSecret(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete webhook");
    }
  }

  return (
    <>
      {savedSecret && (
        <div className="mb-10 border border-accent bg-surface">
          <div className="flex items-center justify-between border-b border-rule px-5 py-3 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
            <span>
              <span className="text-accent">├&nbsp;</span>
              <span className="text-accent">signing_secret_issued</span>
            </span>
            <span className="text-accent">● copy now</span>
          </div>
          <div className="space-y-4 px-6 py-6">
            <p className="font-sans text-[14px] text-muted-strong">
              Use this to verify webhook requests. It&apos;s only shown once.
            </p>
            <div className="break-all border border-rule-strong bg-bg px-4 py-3 font-mono text-[13px] text-text">
              {savedSecret}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => navigator.clipboard.writeText(savedSecret)}
                className="inline-flex items-center gap-2 rounded-none bg-accent px-4 py-2 font-mono text-[12px] font-semibold text-black hover:bg-accent-hover"
              >
                <span>$</span> copy
              </button>
              <button
                onClick={() => setSavedSecret(null)}
                className="font-mono text-[12px] uppercase tracking-[0.1em] text-muted hover:text-text"
              >
                dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      <form
        onSubmit={handleSave}
        className="border border-rule-strong bg-surface"
      >
        <div className="flex items-center justify-between border-b border-rule px-5 py-3 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
          <span>
            <span className="text-accent">├&nbsp;</span>
            <span className="text-text">webhook_endpoint</span>
          </span>
          <span>
            {enabled ? (
              <>
                <span className="text-success">●</span> enabled
              </>
            ) : (
              <>
                <span className="text-muted">○</span> disabled
              </>
            )}
          </span>
        </div>
        <div className="space-y-5 px-6 py-6">
          <div>
            <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
              webhook_url
            </label>
            <input
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full rounded-none border border-rule-strong bg-transparent px-4 py-2.5 font-mono text-[13px] text-text placeholder:text-muted focus:border-accent focus:outline-none"
              placeholder="https://api.myapp.com/edgepush/webhook"
            />
          </div>

          <label className="flex cursor-pointer items-center gap-3 font-mono text-[12px] text-muted-strong">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="h-4 w-4 accent-accent"
            />
            <span>
              <span className="text-accent">●</span> enabled
            </span>
          </label>

          {error && (
            <p className="font-mono text-[12px] text-error">
              <span>●</span> {error}
            </p>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={upsertWebhook.isPending}
              className="inline-flex items-center gap-2 rounded-none bg-text px-4 py-2.5 font-mono text-[12px] font-semibold text-black hover:bg-accent disabled:opacity-50"
            >
              <span className="text-accent">$</span>{" "}
              {upsertWebhook.isPending ? "saving..." : "save"}
            </button>
            {exists && (
              <button
                type="button"
                onClick={handleDelete}
                className="font-mono text-[11px] uppercase tracking-[0.1em] text-error hover:text-error/80"
              >
                delete
              </button>
            )}
          </div>
        </div>
      </form>
    </>
  );
}

function SignatureSnippet() {
  return (
    <div className="mt-12 border-t border-rule pt-10">
      <div className="mb-4 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
        <span className="text-accent">─&nbsp;</span> verifying signatures
      </div>
      <h2 className="mb-4 font-mono text-[20px] font-bold text-text">
        verify the signature.
      </h2>
      <p className="mb-4 font-sans text-[14px] leading-[1.6] text-muted-strong">
        Every webhook request includes an{" "}
        <span className="font-mono text-text">X-Edgepush-Signature</span>{" "}
        header with the format{" "}
        <span className="font-mono text-text">sha256=&lt;base64&gt;</span>.
        Verify it with HMAC-SHA256 using your signing secret:
      </p>
      <pre className="overflow-x-auto border border-rule-strong bg-surface p-5 font-mono text-[12px] leading-[1.6] text-text">
        <code>{`import { createHmac } from "node:crypto";

const signature = req.headers["x-edgepush-signature"]; // "sha256=..."
const expected = createHmac("sha256", EDGEPUSH_WEBHOOK_SECRET)
  .update(req.rawBody)
  .digest("base64");

if (signature !== \`sha256=\${expected}\`) {
  return res.status(401).end();
}`}</code>
      </pre>
    </div>
  );
}
