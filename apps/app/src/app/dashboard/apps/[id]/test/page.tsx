"use client";

import Link from "next/link";
import { use, useState } from "react";

import { useSendTestPush } from "@/lib/queries";

export default function TestPushPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(props.params);
  const sendTestPush = useSendTestPush(id);
  const [to, setTo] = useState("");
  const [platform, setPlatform] = useState<"ios" | "android" | "">("");
  const [title, setTitle] = useState("Test push from edgepush");
  const [body, setBody] = useState(
    "If you received this, your setup is working correctly.",
  );
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    try {
      const r = await sendTestPush.mutateAsync({
        to,
        platform: platform === "" ? undefined : platform,
        title,
        body,
      });
      setResult(r.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send");
    }
  }

  return (
    <div className="mx-auto max-w-[720px] px-6 py-12">
      <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
        <Link href="/dashboard" className="hover:text-text">
          workspace / apps
        </Link>{" "}
        /{" "}
        <Link href={`/dashboard/apps/${id}`} className="hover:text-text">
          {id.slice(0, 8)}
        </Link>{" "}
        / <span className="text-text">test</span>
      </div>

      <h1 className="mb-2 font-mono text-[36px] font-extrabold leading-[1.02] tracking-[-0.025em] text-text">
        test push.
      </h1>
      <p className="mb-10 font-sans text-[14px] leading-[1.55] text-muted-strong">
        Paste a device token to verify your APNs or FCM credentials are
        working. The message is dispatched through the same queue as production
        sends.
      </p>

      <form
        onSubmit={handleSubmit}
        className="border border-rule-strong bg-surface"
      >
        <div className="flex items-center justify-between border-b border-rule px-5 py-3 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
          <span>
            <span className="text-accent">├&nbsp;</span>
            <span className="text-text">send_test_push</span>
          </span>
          <span>
            <span className="text-accent">●</span> dispatches via queue
          </span>
        </div>
        <div className="space-y-5 px-6 py-6">
          <div>
            <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
              device_token
            </label>
            <textarea
              required
              value={to}
              onChange={(e) => setTo(e.target.value)}
              rows={3}
              className="w-full rounded-none border border-rule-strong bg-bg px-4 py-3 font-mono text-[12px] text-text placeholder:text-muted focus:border-accent focus:outline-none"
              placeholder="APNs hex token or FCM registration token"
            />
          </div>

          <div>
            <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
              platform
            </label>
            <select
              value={platform}
              onChange={(e) =>
                setPlatform(e.target.value as "" | "ios" | "android")
              }
              className="w-full rounded-none border border-rule-strong bg-transparent px-4 py-2.5 font-mono text-[13px] text-text focus:border-accent focus:outline-none"
            >
              <option value="">auto-detect</option>
              <option value="ios">ios (apns)</option>
              <option value="android">android (fcm)</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
              title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-none border border-rule-strong bg-transparent px-4 py-2.5 font-sans text-[14px] text-text placeholder:text-muted focus:border-accent focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
              body
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              className="w-full rounded-none border border-rule-strong bg-transparent px-4 py-3 font-sans text-[14px] text-text placeholder:text-muted focus:border-accent focus:outline-none"
            />
          </div>

          {error && (
            <p className="font-mono text-[12px] text-error">
              <span>●</span> {error}
            </p>
          )}

          {result && (
            <div className="border border-success bg-bg px-4 py-3">
              <p className="font-mono text-[12px] text-success">
                <span>●</span> queued · ticket_id:{" "}
                <span className="text-text">{result}</span>
              </p>
              <Link
                href={`/dashboard/apps/${id}/messages`}
                className="mt-2 inline-block font-mono text-[11px] uppercase tracking-[0.1em] text-text underline decoration-accent underline-offset-4 hover:text-accent"
              >
                view_messages ─&gt;
              </Link>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={sendTestPush.isPending || !to}
              className="inline-flex items-center gap-2 rounded-none bg-text px-4 py-2.5 font-mono text-[12px] font-semibold text-black hover:bg-accent disabled:opacity-50"
            >
              <span className="text-accent">$</span>{" "}
              {sendTestPush.isPending ? "sending..." : "send"}
            </button>
            <Link
              href={`/dashboard/apps/${id}`}
              className="font-mono text-[12px] uppercase tracking-[0.1em] text-muted hover:text-text"
            >
              cancel
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}
