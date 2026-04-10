"use client";

import { use, useState } from "react";
import Link from "next/link";

import { useToast } from "@/components/toast";
import {
  useApiKeys,
  useCreateApiKey,
  useCredentials,
  useMetrics,
  useRevokeApiKey,
} from "@/lib/queries";

export default function AppDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(props.params);
  const toast = useToast();
  const apiKeys = useApiKeys(id);
  const credentials = useCredentials(id);
  const metrics = useMetrics(id);
  const createApiKey = useCreateApiKey(id);
  const revokeApiKey = useRevokeApiKey(id);
  const [newKey, setNewKey] = useState<string | null>(null);

  const loading =
    apiKeys.isLoading || credentials.isLoading || metrics.isLoading;

  async function handleCreateKey() {
    const label = prompt("Label for this API key?", "default");
    if (!label) return;
    try {
      const result = await createApiKey.mutateAsync(label);
      setNewKey(result.apiKey);
      toast.success("API key created. Copy it now.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create key");
    }
  }

  async function handleRevokeKey(keyId: string) {
    if (!confirm("Revoke this API key? Apps using it will stop working."))
      return;
    try {
      await revokeApiKey.mutateAsync(keyId);
      toast.success("API key revoked");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to revoke key");
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <Link
        href="/dashboard"
        className="text-sm text-zinc-500 hover:text-zinc-200 mb-6 inline-block"
      >
        &larr; Apps
      </Link>

      {newKey && (
        <div className="border border-emerald-400/30 bg-emerald-400/5 rounded-xl p-6 mb-8">
          <h3 className="font-semibold text-emerald-300 mb-2">
            Copy your API key now
          </h3>
          <p className="text-sm text-zinc-400 mb-4">
            This is the only time you&apos;ll see the full key. Store it in
            your server&apos;s secret manager.
          </p>
          <div className="bg-black rounded-lg p-4 font-mono text-sm break-all mb-4">
            {newKey}
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(newKey);
            }}
            className="text-sm underline underline-offset-4"
          >
            Copy to clipboard
          </button>
          <button
            onClick={() => setNewKey(null)}
            className="text-sm underline underline-offset-4 ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-zinc-500">Loading...</p>
      ) : (
        <>
          {/* Metrics */}
          {metrics.data && metrics.data.total > 0 && (
            <section className="mb-12">
              <h2 className="text-xl font-semibold mb-4">Last 7 days</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <Stat
                  label="Sent"
                  value={metrics.data.last7.total.toLocaleString()}
                />
                <Stat
                  label="Delivered"
                  value={metrics.data.last7.delivered.toLocaleString()}
                  sublabel={
                    metrics.data.last7.total > 0
                      ? `${((metrics.data.last7.delivered / metrics.data.last7.total) * 100).toFixed(1)}%`
                      : undefined
                  }
                  color="text-emerald-300"
                />
                <Stat
                  label="Failed"
                  value={metrics.data.last7.failed.toLocaleString()}
                  color="text-red-300"
                />
                <Stat
                  label="Inflight"
                  value={metrics.data.inflight.toLocaleString()}
                  color="text-blue-300"
                />
              </div>
              <DailyChart data={metrics.data.daily} />
            </section>
          )}

          {/* API Keys */}
          <section className="mb-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">API keys</h2>
              <button
                onClick={handleCreateKey}
                className="rounded-lg bg-white text-black px-4 py-2 text-sm font-medium hover:bg-zinc-200"
              >
                New key
              </button>
            </div>
            {!apiKeys.data || apiKeys.data.length === 0 ? (
              <div className="border border-dashed border-white/10 rounded-xl p-8 text-center text-sm text-zinc-500">
                No API keys. Create one to start sending pushes.
              </div>
            ) : (
              <div className="space-y-2">
                {apiKeys.data.map((k) => (
                  <div
                    key={k.id}
                    className="border border-white/10 rounded-lg p-4 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-medium">{k.label}</div>
                      <div className="text-xs text-zinc-500 font-mono mt-1">
                        ...{k.preview}...
                        {k.revokedAt ? " (revoked)" : null}
                      </div>
                    </div>
                    {!k.revokedAt && (
                      <button
                        onClick={() => handleRevokeKey(k.id)}
                        className="text-sm text-red-400 hover:text-red-300"
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Credentials */}
          <section className="mb-12">
            <h2 className="text-xl font-semibold mb-4">Credentials</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CredentialCard
                title="APNs (iOS)"
                configured={!!credentials.data?.apns}
                details={
                  credentials.data?.apns
                    ? `${credentials.data.apns.bundleId} | ${credentials.data.apns.production ? "production" : "sandbox"}`
                    : "Not configured"
                }
                href={`/dashboard/apps/${id}/credentials/apns`}
              />
              <CredentialCard
                title="FCM (Android)"
                configured={!!credentials.data?.fcm}
                details={
                  credentials.data?.fcm
                    ? credentials.data.fcm.projectId
                    : "Not configured"
                }
                href={`/dashboard/apps/${id}/credentials/fcm`}
              />
            </div>
          </section>

          <section className="flex flex-wrap items-center gap-6">
            <Link
              href={`/dashboard/apps/${id}/test`}
              className="rounded-lg bg-white text-black px-4 py-2 text-sm font-medium hover:bg-zinc-200"
            >
              Send test push
            </Link>
            <Link
              href={`/dashboard/apps/${id}/messages`}
              className="text-sm text-zinc-400 hover:text-zinc-200 underline underline-offset-4"
            >
              Send history &rarr;
            </Link>
            <Link
              href={`/dashboard/apps/${id}/webhook`}
              className="text-sm text-zinc-400 hover:text-zinc-200 underline underline-offset-4"
            >
              Webhook &rarr;
            </Link>
            <Link
              href={`/dashboard/apps/${id}/audit`}
              className="text-sm text-zinc-400 hover:text-zinc-200 underline underline-offset-4"
            >
              Activity log &rarr;
            </Link>
          </section>
        </>
      )}
    </div>
  );
}

function CredentialCard({
  title,
  configured,
  details,
  href,
}: {
  title: string;
  configured: boolean;
  details: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="border border-white/10 rounded-xl p-5 hover:border-white/20 hover:bg-white/[0.02] transition-colors block"
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold">{title}</h3>
        <span
          className={`text-xs px-2 py-1 rounded-full ${
            configured
              ? "bg-emerald-400/10 text-emerald-300"
              : "bg-zinc-500/10 text-zinc-500"
          }`}
        >
          {configured ? "Configured" : "Not set"}
        </span>
      </div>
      <p className="text-sm text-zinc-500 font-mono">{details}</p>
    </Link>
  );
}

function Stat({
  label,
  value,
  sublabel,
  color = "text-white",
}: {
  label: string;
  value: string;
  sublabel?: string;
  color?: string;
}) {
  return (
    <div className="border border-white/10 rounded-xl p-4">
      <div className="text-xs uppercase tracking-wider text-zinc-500 mb-2">
        {label}
      </div>
      <div className={`text-2xl font-semibold ${color}`}>{value}</div>
      {sublabel && (
        <div className="text-xs text-zinc-500 mt-1">{sublabel}</div>
      )}
    </div>
  );
}

function DailyChart({
  data,
}: {
  data: Array<{ date: string; delivered: number; failed: number }>;
}) {
  const max = Math.max(
    1,
    ...data.map((d) => d.delivered + d.failed),
  );
  return (
    <div className="border border-white/10 rounded-xl p-4">
      <div className="text-xs uppercase tracking-wider text-zinc-500 mb-4">
        Last 14 days
      </div>
      <div className="flex items-end gap-1 h-24">
        {data.map((d) => {
          const total = d.delivered + d.failed;
          const deliveredPct = (d.delivered / max) * 100;
          const failedPct = (d.failed / max) * 100;
          return (
            <div
              key={d.date}
              className="flex-1 flex flex-col-reverse gap-0.5"
              title={`${d.date}: ${d.delivered} delivered, ${d.failed} failed`}
            >
              {total > 0 ? (
                <>
                  {d.delivered > 0 && (
                    <div
                      className="bg-emerald-400/70 rounded-sm"
                      style={{ height: `${deliveredPct}%`, minHeight: "2px" }}
                    />
                  )}
                  {d.failed > 0 && (
                    <div
                      className="bg-red-400/70 rounded-sm"
                      style={{ height: `${failedPct}%`, minHeight: "2px" }}
                    />
                  )}
                </>
              ) : (
                <div
                  className="bg-white/[0.03] rounded-sm"
                  style={{ height: "2px" }}
                />
              )}
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-4 mt-4 text-xs text-zinc-500">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm bg-emerald-400/70" />
          Delivered
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm bg-red-400/70" />
          Failed
        </div>
      </div>
    </div>
  );
}
