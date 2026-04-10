"use client";

import Link from "next/link";
import { use } from "react";

import { useAuditLog } from "@/lib/queries";

const ACTION_LABELS: Record<string, string> = {
  "app.created": "App created",
  "api_key.created": "API key created",
  "api_key.revoked": "API key revoked",
  "apns.updated": "APNs credentials updated",
  "apns.deleted": "APNs credentials deleted",
  "fcm.updated": "FCM credentials updated",
  "fcm.deleted": "FCM credentials deleted",
  "webhook.updated": "Webhook updated",
  "webhook.deleted": "Webhook deleted",
};

export default function AuditPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(props.params);
  const entries = useAuditLog(id);

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <Link
        href={`/dashboard/apps/${id}`}
        className="text-sm text-zinc-500 hover:text-zinc-200 mb-6 inline-block"
      >
        &larr; Back
      </Link>

      <h1 className="text-3xl font-semibold mb-2">Activity log</h1>
      <p className="text-sm text-zinc-500 mb-8">
        Audit trail of credential changes and API key activity for this app.
      </p>

      {entries.isLoading ? (
        <p className="text-sm text-zinc-500">Loading...</p>
      ) : !entries.data || entries.data.length === 0 ? (
        <div className="border border-dashed border-white/10 rounded-xl p-12 text-center text-sm text-zinc-500">
          No activity yet.
        </div>
      ) : (
        <div className="space-y-2">
          {entries.data.map((entry) => (
            <div
              key={entry.id}
              className="border border-white/10 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm">
                  {ACTION_LABELS[entry.action] ?? entry.action}
                </span>
                <span className="text-xs text-zinc-500">
                  {new Date(entry.createdAt).toLocaleString()}
                </span>
              </div>
              {entry.metadata && (
                <pre className="text-xs text-zinc-500 font-mono mt-2 overflow-x-auto">
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
