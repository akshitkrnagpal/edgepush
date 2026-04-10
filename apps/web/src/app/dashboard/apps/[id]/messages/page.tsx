"use client";

import Link from "next/link";
import { use } from "react";

import { useMessages } from "@/lib/queries";

export default function MessagesPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(props.params);
  const messages = useMessages(id);

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <Link
        href={`/dashboard/apps/${id}`}
        className="text-sm text-zinc-500 hover:text-zinc-200 mb-6 inline-block"
      >
        &larr; Back
      </Link>

      <h1 className="text-3xl font-semibold mb-8">Send history</h1>

      {messages.isLoading ? (
        <p className="text-sm text-zinc-500">Loading...</p>
      ) : !messages.data || messages.data.length === 0 ? (
        <div className="border border-dashed border-white/10 rounded-xl p-12 text-center text-sm text-zinc-500">
          No messages sent yet.
        </div>
      ) : (
        <div className="space-y-2">
          {messages.data.map((msg) => (
            <div
              key={msg.id}
              className="border border-white/10 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <StatusBadge status={msg.status} />
                  <span className="text-xs uppercase text-zinc-500">
                    {msg.platform}
                  </span>
                  <span className="text-xs text-zinc-500 font-mono">
                    ...{msg.to.slice(-12)}
                  </span>
                </div>
                <span className="text-xs text-zinc-600">
                  {new Date(msg.createdAt).toLocaleString()}
                </span>
              </div>
              {msg.title && (
                <p className="text-sm font-medium">{msg.title}</p>
              )}
              {msg.body && (
                <p className="text-sm text-zinc-400 line-clamp-2">{msg.body}</p>
              )}
              {msg.error && (
                <p className="text-xs text-red-400 mt-2 font-mono">
                  {msg.error}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    delivered: "bg-emerald-400/10 text-emerald-300",
    failed: "bg-red-400/10 text-red-300",
    sending: "bg-blue-400/10 text-blue-300",
    queued: "bg-zinc-500/10 text-zinc-400",
    expired: "bg-orange-400/10 text-orange-300",
  };
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full ${colors[status] ?? colors.queued}`}
    >
      {status}
    </span>
  );
}
