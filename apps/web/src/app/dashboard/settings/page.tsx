"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";

export default function SettingsPage() {
  const router = useRouter();
  const { data: session } = authClient.useSession();

  const [name, setName] = useState(session?.user.name ?? "");

  const [profileStatus, setProfileStatus] = useState<string | null>(null);
  const [deleteStatus, setDeleteStatus] = useState<string | null>(null);

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileStatus(null);
    try {
      const result = await authClient.updateUser({ name });
      if (result.error) {
        setProfileStatus(`Error: ${result.error.message ?? "failed"}`);
        return;
      }
      setProfileStatus("saved");
    } catch (err) {
      setProfileStatus(
        `Error: ${err instanceof Error ? err.message : "failed"}`,
      );
    }
  }

  async function handleDeleteAccount() {
    if (
      !confirm(
        "Are you sure? This deletes your account, all apps, credentials, and messages. This cannot be undone.",
      )
    ) {
      return;
    }
    setDeleteStatus(null);
    try {
      const result = await authClient.deleteUser({});
      if (result.error) {
        setDeleteStatus(`Error: ${result.error.message ?? "failed"}`);
        return;
      }
      router.replace("/");
    } catch (err) {
      setDeleteStatus(
        `Error: ${err instanceof Error ? err.message : "failed"}`,
      );
    }
  }

  if (!session) return null;

  const isProfileError = profileStatus?.startsWith("Error");

  return (
    <div className="mx-auto max-w-[780px] px-6 py-12">
      <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
        <span className="text-accent">─&nbsp;</span> workspace / settings
      </div>
      <h1 className="mb-2 font-mono text-[36px] font-extrabold leading-[1.02] tracking-[-0.025em] text-text">
        settings.
      </h1>
      <p className="mb-12 font-mono text-[12px] text-muted">
        <span className="text-accent">●</span> signed in as {session.user.email}
      </p>

      <section className="mb-12 border border-rule-strong bg-surface">
        <PanelHead title="profile" />
        <form onSubmit={handleUpdateProfile} className="space-y-5 px-6 py-6">
          <Field label="name" value={name} onChange={setName} />
          <div>
            <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
              email
            </label>
            <input
              type="email"
              value={session.user.email}
              disabled
              className="w-full cursor-not-allowed rounded-none border border-rule-strong bg-transparent px-4 py-2.5 font-sans text-[14px] text-muted"
            />
          </div>
          {profileStatus && (
            <p
              className={`font-mono text-[12px] ${
                isProfileError ? "text-error" : "text-success"
              }`}
            >
              <span>●</span>{" "}
              {isProfileError ? profileStatus : "● profile saved"}
            </p>
          )}
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-none bg-text px-4 py-2.5 font-mono text-[12px] font-semibold text-black hover:bg-accent"
          >
            <span className="text-accent">$</span> save_profile
          </button>
        </form>
      </section>

      <section className="border border-error bg-surface">
        <div className="flex items-center justify-between border-b border-rule px-5 py-3 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
          <span>
            <span className="text-error">├&nbsp;</span>
            <span className="text-error">danger_zone</span>
          </span>
          <span className="text-error">● irreversible</span>
        </div>
        <div className="space-y-4 px-6 py-6">
          <p className="font-sans text-[14px] leading-[1.55] text-muted-strong">
            Permanently delete your account and all associated apps,
            credentials, and messages. This cannot be undone.
          </p>
          {deleteStatus && (
            <p className="font-mono text-[12px] text-error">
              <span>●</span> {deleteStatus}
            </p>
          )}
          <button
            onClick={handleDeleteAccount}
            className="inline-flex items-center gap-2 rounded-none border border-error px-4 py-2.5 font-mono text-[12px] font-semibold text-error hover:bg-error/10"
          >
            <span>●</span> delete_account
          </button>
        </div>
      </section>
    </div>
  );
}

function PanelHead({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-between border-b border-rule px-5 py-3 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
      <span>
        <span className="text-accent">├&nbsp;</span>
        <span className="text-text">{title}</span>
      </span>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-none border border-rule-strong bg-transparent px-4 py-2.5 font-sans text-[14px] text-text placeholder:text-muted focus:border-accent focus:outline-none"
      />
    </div>
  );
}
