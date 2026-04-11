"use client";

import Link from "next/link";
import { use } from "react";

import { useAuditLog } from "@/lib/queries";

const ACTION_LABELS: Record<string, string> = {
  "app.created": "app created",
  "api_key.created": "api key created",
  "api_key.revoked": "api key revoked",
  "apns.updated": "apns credentials updated",
  "apns.deleted": "apns credentials deleted",
  "fcm.updated": "fcm credentials updated",
  "fcm.deleted": "fcm credentials deleted",
  "webhook.updated": "webhook updated",
  "webhook.deleted": "webhook deleted",
};

export default function AuditPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(props.params);
  const entries = useAuditLog(id);
  const entryList = entries.data;

  return (
    <div className="mx-auto max-w-[960px] px-6 py-12">
      <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
        <Link href="/dashboard" className="hover:text-text">
          workspace / apps
        </Link>{" "}
        /{" "}
        <Link href={`/dashboard/apps/${id}`} className="hover:text-text">
          {id.slice(0, 8)}
        </Link>{" "}
        / <span className="text-text">audit</span>
      </div>

      <h1 className="mb-2 font-mono text-[36px] font-extrabold leading-[1.02] tracking-[-0.025em] text-text">
        audit log.
      </h1>
      <p className="mb-10 font-sans text-[14px] text-muted-strong">
        Audit trail of credential changes and API key activity for this app.
      </p>

      {entries.isLoading ? (
        <p className="font-mono text-[12px] text-muted">
          <span className="text-accent">●</span> loading…
        </p>
      ) : !entryList || entryList.length === 0 ? (
        <div className="border border-dashed border-rule-strong px-6 py-16 text-center font-mono text-[12px] text-muted">
          <span className="text-accent">○</span> no activity yet
        </div>
      ) : (
        <div className="border border-rule-strong bg-surface">
          <div className="grid grid-cols-[1fr_180px] items-center border-b border-rule bg-[#050505] px-5 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
            <span>action</span>
            <span>when</span>
          </div>
          {entryList.map((entry, i) => (
            <div
              key={entry.id}
              className={`px-5 py-4 ${
                i < entryList.length - 1 ? "border-b border-rule" : ""
              }`}
            >
              <div className="grid grid-cols-[1fr_180px] items-start gap-4">
                <span className="font-mono text-[13px] text-text">
                  <span className="text-accent">├&nbsp;</span>
                  {ACTION_LABELS[entry.action] ?? entry.action}
                </span>
                <span className="tnum font-mono text-[11px] text-muted">
                  {new Date(entry.createdAt)
                    .toISOString()
                    .replace("T", " ")
                    .slice(0, 19)}
                </span>
              </div>
              {entry.metadata && (
                <pre className="mt-3 overflow-x-auto pl-4 font-mono text-[11px] text-muted">
                  {JSON.stringify(entry.metadata, null, 2)}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
