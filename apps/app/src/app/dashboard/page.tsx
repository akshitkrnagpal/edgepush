"use client";

import Link from "next/link";
import { useState } from "react";

import { useApps, useCreateApp } from "@/lib/queries";

export default function DashboardPage() {
  const apps = useApps();
  const createApp = useCreateApp();

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [packageName, setPackageName] = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createApp.mutateAsync({ name, packageName });
      setName("");
      setPackageName("");
      setShowForm(false);
    } catch {
      // mutation error is exposed via createApp.error below
    }
  }

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-12">
      <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
        <span className="text-accent">─&nbsp;</span> workspace / apps
      </div>
      <div className="mb-10 flex items-start justify-between gap-6">
        <div>
          <h1 className="mb-2 font-mono text-[36px] font-extrabold leading-[1.02] tracking-[-0.025em] text-text">
            apps.
          </h1>
          <p className="font-sans text-[14px] text-muted-strong">
            Manage your push notification apps and API keys.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 rounded-none bg-text px-4 py-2.5 font-mono text-[12px] font-semibold text-black hover:bg-accent"
        >
          <span className="text-accent">$</span> new_app
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mb-10 border border-rule-strong bg-surface"
        >
          <div className="flex items-center justify-between border-b border-rule px-5 py-3 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
            <span>
              <span className="text-accent">├&nbsp;</span>
              <span className="text-text">create_app</span>
            </span>
            <span>● draft</span>
          </div>
          <div className="space-y-5 px-6 py-6">
            <Field
              label="name"
              value={name}
              onChange={setName}
              placeholder="My awesome app"
            />
            <Field
              label="package_name"
              value={packageName}
              onChange={setPackageName}
              placeholder="io.acme.myapp"
              mono
              help="Your bundle id (iOS) or package name (Android). Shown as the prefix in your API keys."
            />
            {createApp.error && (
              <p className="font-mono text-[12px] text-error">
                <span>●</span>{" "}
                {createApp.error instanceof Error
                  ? createApp.error.message
                  : "failed to create app"}
              </p>
            )}
            <div className="flex items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={createApp.isPending}
                className="inline-flex items-center gap-2 rounded-none bg-text px-4 py-2.5 font-mono text-[12px] font-semibold text-black hover:bg-accent disabled:opacity-50"
              >
                <span className="text-accent">$</span>{" "}
                {createApp.isPending ? "creating..." : "create"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="font-mono text-[12px] uppercase tracking-[0.1em] text-muted hover:text-text"
              >
                cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {apps.isLoading ? (
        <p className="font-mono text-[12px] text-muted">
          <span className="text-accent">●</span> loading apps…
        </p>
      ) : apps.data && apps.data.length > 0 ? (
        <div className="border border-rule-strong bg-surface">
          <div className="grid grid-cols-[1fr_auto] items-center border-b border-rule bg-[#050505] px-5 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
            <span>app</span>
            <span>created</span>
          </div>
          {apps.data.map((app) => (
            <Link
              key={app.id}
              href={`/dashboard/apps/${app.id}`}
              className="grid grid-cols-[1fr_auto] items-center gap-4 border-b border-rule px-5 py-4 last:border-b-0 hover:bg-[#0f0f0f]"
            >
              <div>
                <div className="font-mono text-[14px] font-bold text-text">
                  <span className="text-accent">├&nbsp;</span>
                  {app.name}
                </div>
                <div className="mt-1 pl-4 font-mono text-[12px] text-muted">
                  {app.packageName}
                </div>
              </div>
              <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
                {new Date(app.createdAt).toISOString().slice(0, 10)}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="border border-dashed border-rule-strong px-6 py-16 text-center">
          <p className="mb-4 font-mono text-[12px] text-muted">
            <span className="text-accent">○</span> no apps yet
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="font-mono text-[12px] uppercase tracking-[0.1em] text-text underline decoration-accent underline-offset-4 hover:text-accent"
          >
            $ create_your_first_app
          </button>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  mono = false,
  help,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  mono?: boolean;
  help?: string;
}) {
  return (
    <div>
      <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
        {label}
      </label>
      <input
        type="text"
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-none border border-rule-strong bg-transparent px-4 py-2.5 text-[14px] text-text placeholder:text-muted focus:border-accent focus:outline-none ${
          mono ? "font-mono text-[13px]" : "font-sans"
        }`}
      />
      {help && (
        <p className="mt-2 font-sans text-[12px] text-muted">{help}</p>
      )}
    </div>
  );
}
