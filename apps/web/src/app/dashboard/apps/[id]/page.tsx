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
    <div className="mx-auto max-w-[1200px] px-6 py-12">
      <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
        <Link href="/dashboard" className="hover:text-text">
          workspace / apps
        </Link>{" "}
        / <span className="text-text">{id.slice(0, 8)}</span>
      </div>

      {newKey && (
        <div className="mb-10 border border-accent bg-surface">
          <div className="flex items-center justify-between border-b border-rule px-5 py-3 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
            <span>
              <span className="text-accent">├&nbsp;</span>
              <span className="text-accent">api_key_issued</span>
            </span>
            <span className="text-accent">● copy now</span>
          </div>
          <div className="space-y-4 px-6 py-6">
            <p className="font-sans text-[14px] text-muted-strong">
              This is the only time you&apos;ll see the full key. Store it in
              your server&apos;s secret manager.
            </p>
            <div className="break-all border border-rule-strong bg-bg px-4 py-3 font-mono text-[13px] text-text">
              {newKey}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(newKey);
                  toast.success("copied to clipboard");
                }}
                className="inline-flex items-center gap-2 rounded-none bg-accent px-4 py-2 font-mono text-[12px] font-semibold text-black hover:bg-accent-hover"
              >
                <span>$</span> copy
              </button>
              <button
                onClick={() => setNewKey(null)}
                className="font-mono text-[12px] uppercase tracking-[0.1em] text-muted hover:text-text"
              >
                dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <p className="font-mono text-[12px] text-muted">
          <span className="text-accent">●</span> loading…
        </p>
      ) : (
        <>
          {metrics.data && metrics.data.total > 0 && (
            <section className="mb-12">
              <SectionLabel>last 7 days</SectionLabel>
              <div className="mb-6 grid grid-cols-2 gap-0 border border-rule-strong sm:grid-cols-4">
                <Stat
                  label="sent"
                  value={metrics.data.last7.total.toLocaleString()}
                />
                <Stat
                  label="delivered"
                  value={metrics.data.last7.delivered.toLocaleString()}
                  sublabel={
                    metrics.data.last7.total > 0
                      ? `${((metrics.data.last7.delivered / metrics.data.last7.total) * 100).toFixed(1)}% rate`
                      : undefined
                  }
                  accent="success"
                />
                <Stat
                  label="failed"
                  value={metrics.data.last7.failed.toLocaleString()}
                  accent="error"
                />
                <Stat
                  label="inflight"
                  value={metrics.data.inflight.toLocaleString()}
                  accent="accent"
                  last
                />
              </div>
              <DailyChart data={metrics.data.daily} />
            </section>
          )}

          <section className="mb-12">
            <div className="mb-4 flex items-center justify-between">
              <SectionLabel>api keys</SectionLabel>
              <button
                onClick={handleCreateKey}
                className="inline-flex items-center gap-2 rounded-none bg-text px-4 py-2 font-mono text-[12px] font-semibold text-black hover:bg-accent"
              >
                <span className="text-accent">$</span> new_key
              </button>
            </div>
            {!apiKeys.data || apiKeys.data.length === 0 ? (
              <div className="border border-dashed border-rule-strong px-6 py-10 text-center font-mono text-[12px] text-muted">
                <span className="text-accent">○</span> no api keys — create one
                to start sending pushes
              </div>
            ) : (
              <div className="border border-rule-strong bg-surface">
                {apiKeys.data.map((k, i) => (
                  <div
                    key={k.id}
                    className={`flex items-center justify-between px-5 py-4 ${
                      i < apiKeys.data.length - 1 ? "border-b border-rule" : ""
                    }`}
                  >
                    <div>
                      <div className="font-mono text-[13px] font-bold text-text">
                        <span className="text-accent">├&nbsp;</span>
                        {k.label}
                        {k.revokedAt && (
                          <span className="ml-2 font-normal text-muted">
                            ● revoked
                          </span>
                        )}
                      </div>
                      <div className="mt-1 pl-4 font-mono text-[11px] text-muted">
                        …{k.preview}…
                      </div>
                    </div>
                    {!k.revokedAt && (
                      <button
                        onClick={() => handleRevokeKey(k.id)}
                        className="font-mono text-[11px] uppercase tracking-[0.1em] text-error hover:text-error/80"
                      >
                        revoke
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="mb-12">
            <SectionLabel>credentials</SectionLabel>
            <div className="grid grid-cols-1 gap-0 border border-rule-strong md:grid-cols-2">
              <CredentialCard
                title="apns (ios)"
                configured={!!credentials.data?.apns}
                details={
                  credentials.data?.apns
                    ? `${credentials.data.apns.bundleId} · ${credentials.data.apns.production ? "production" : "sandbox"}`
                    : "not configured"
                }
                href={`/dashboard/apps/${id}/credentials/apns`}
              />
              <CredentialCard
                title="fcm (android)"
                configured={!!credentials.data?.fcm}
                details={
                  credentials.data?.fcm
                    ? credentials.data.fcm.projectId
                    : "not configured"
                }
                href={`/dashboard/apps/${id}/credentials/fcm`}
                last
              />
            </div>
          </section>

          <section className="flex flex-wrap items-center gap-3">
            <Link
              href={`/dashboard/apps/${id}/test`}
              className="inline-flex items-center gap-2 rounded-none bg-text px-4 py-2.5 font-mono text-[12px] font-semibold text-black hover:bg-accent"
            >
              <span className="text-accent">$</span> send_test_push
            </Link>
            <DashLink href={`/dashboard/apps/${id}/messages`}>
              messages
            </DashLink>
            <DashLink href={`/dashboard/apps/${id}/webhook`}>webhook</DashLink>
            <DashLink href={`/dashboard/apps/${id}/audit`}>audit_log</DashLink>
          </section>
        </>
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
      <span className="text-accent">─&nbsp;</span>
      {children}
    </div>
  );
}

function DashLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-none border border-rule-strong px-4 py-2.5 font-mono text-[12px] font-semibold text-text hover:border-text"
    >
      {children} <span className="text-muted">─&gt;</span>
    </Link>
  );
}

function CredentialCard({
  title,
  configured,
  details,
  href,
  last = false,
}: {
  title: string;
  configured: boolean;
  details: string;
  href: string;
  last?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`block bg-surface px-5 py-5 hover:bg-[#0f0f0f] ${
        !last ? "border-b border-rule md:border-b-0 md:border-r" : ""
      }`}
    >
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-mono text-[14px] font-bold text-text">
          <span className="text-accent">├&nbsp;</span>
          {title}
        </h3>
        <span
          className={`font-mono text-[10px] uppercase tracking-[0.12em] ${
            configured ? "text-success" : "text-muted"
          }`}
        >
          {configured ? "● configured" : "○ not set"}
        </span>
      </div>
      <p className="pl-4 font-mono text-[12px] text-muted">{details}</p>
    </Link>
  );
}

function Stat({
  label,
  value,
  sublabel,
  accent = "text",
  last = false,
}: {
  label: string;
  value: string;
  sublabel?: string;
  accent?: "text" | "success" | "error" | "accent";
  last?: boolean;
}) {
  const colorClass =
    accent === "success"
      ? "text-success"
      : accent === "error"
        ? "text-error"
        : accent === "accent"
          ? "text-accent"
          : "text-text";
  return (
    <div
      className={`bg-surface px-5 py-4 ${
        !last ? "border-b border-rule sm:border-b-0 sm:border-r" : ""
      }`}
    >
      <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
        {label}
      </div>
      <div className={`tnum font-mono text-[28px] font-bold ${colorClass}`}>
        {value}
      </div>
      {sublabel && (
        <div className="mt-1 font-mono text-[11px] text-muted">{sublabel}</div>
      )}
    </div>
  );
}

function DailyChart({
  data,
}: {
  data: Array<{ date: string; delivered: number; failed: number }>;
}) {
  const max = Math.max(1, ...data.map((d) => d.delivered + d.failed));
  return (
    <div className="border border-rule-strong bg-surface px-5 py-5">
      <div className="mb-4 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
        <span className="text-accent">─&nbsp;</span> last 14 days
      </div>
      <div className="flex h-24 items-end gap-1">
        {data.map((d) => {
          const total = d.delivered + d.failed;
          const deliveredPct = (d.delivered / max) * 100;
          const failedPct = (d.failed / max) * 100;
          return (
            <div
              key={d.date}
              className="flex flex-1 flex-col-reverse gap-[2px]"
              title={`${d.date}: ${d.delivered} delivered, ${d.failed} failed`}
            >
              {total > 0 ? (
                <>
                  {d.delivered > 0 && (
                    <div
                      className="bg-accent"
                      style={{ height: `${deliveredPct}%`, minHeight: "2px" }}
                    />
                  )}
                  {d.failed > 0 && (
                    <div
                      className="bg-error"
                      style={{ height: `${failedPct}%`, minHeight: "2px" }}
                    />
                  )}
                </>
              ) : (
                <div
                  className="bg-rule"
                  style={{ height: "2px" }}
                />
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex items-center gap-6 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
        <div className="flex items-center gap-1.5">
          <span className="h-[8px] w-[8px] bg-accent" />
          delivered
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-[8px] w-[8px] bg-error" />
          failed
        </div>
      </div>
    </div>
  );
}
