"use client";

import Link from "next/link";
import { use } from "react";

import { useMessages } from "@/lib/queries";

export default function MessagesPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(props.params);
  const messages = useMessages(id);
  const msgList = messages.data;

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-12">
      <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
        <Link href="/dashboard" className="hover:text-text">
          workspace / apps
        </Link>{" "}
        /{" "}
        <Link href={`/dashboard/apps/${id}`} className="hover:text-text">
          {id.slice(0, 8)}
        </Link>{" "}
        / <span className="text-text">messages</span>
      </div>

      <h1 className="mb-8 font-mono text-[36px] font-extrabold leading-[1.02] tracking-[-0.025em] text-text">
        messages.
      </h1>

      {messages.isLoading ? (
        <p className="font-mono text-[12px] text-muted">
          <span className="text-accent">●</span> loading…
        </p>
      ) : !msgList || msgList.length === 0 ? (
        <div className="border border-dashed border-rule-strong px-6 py-16 text-center font-mono text-[12px] text-muted">
          <span className="text-accent">○</span> no messages sent yet
        </div>
      ) : (
        <div className="border border-rule-strong bg-surface">
          <div className="grid grid-cols-[120px_80px_1fr_180px] items-center gap-4 border-b border-rule bg-[#050505] px-5 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
            <span>status</span>
            <span>platform</span>
            <span>title · body</span>
            <span className="text-right">sent_at</span>
          </div>
          {msgList.map((msg, i) => (
            <div
              key={msg.id}
              className={`px-5 py-4 ${
                i < msgList.length - 1 ? "border-b border-rule" : ""
              }`}
            >
              <div className="grid grid-cols-[120px_80px_1fr_180px] items-start gap-4">
                <StatusCell status={msg.status} />
                <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
                  {msg.platform}
                </span>
                <div>
                  {msg.title && (
                    <p className="font-mono text-[13px] font-semibold text-text">
                      {msg.title}
                    </p>
                  )}
                  {msg.body && (
                    <p className="mt-1 line-clamp-1 font-sans text-[13px] text-muted-strong">
                      {msg.body}
                    </p>
                  )}
                  <p className="mt-1 font-mono text-[10px] text-muted">
                    …{msg.to.slice(-16)}
                  </p>
                  {msg.error && (
                    <p className="mt-2 font-mono text-[11px] text-error">
                      <span>●</span> {msg.error}
                    </p>
                  )}
                </div>
                <span className="tnum text-right font-mono text-[11px] text-muted">
                  {new Date(msg.createdAt)
                    .toISOString()
                    .replace("T", " ")
                    .slice(0, 19)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusCell({ status }: { status: string }) {
  const colors: Record<string, string> = {
    delivered: "text-success",
    failed: "text-error",
    sending: "text-accent",
    queued: "text-muted",
    expired: "text-warning",
  };
  const dots: Record<string, string> = {
    delivered: "●",
    failed: "●",
    sending: "●",
    queued: "○",
    expired: "●",
  };
  const color = colors[status] ?? colors.queued;
  const dot = dots[status] ?? dots.queued;
  return (
    <span className={`font-mono text-[11px] uppercase tracking-[0.1em] ${color}`}>
      {dot} {status}
    </span>
  );
}
