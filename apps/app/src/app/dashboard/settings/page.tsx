"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { api } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { useDeleteAccount } from "@/lib/queries";

export default function SettingsPage() {
  const router = useRouter();
  const { data: session } = authClient.useSession();

  const [name, setName] = useState(session?.user.name ?? "");

  const [profileStatus, setProfileStatus] = useState<string | null>(null);
  const [deleteStatus, setDeleteStatus] = useState<string | null>(null);

  // Billing portal state
  const [portalPending, setPortalPending] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);

  async function handleManageSubscription() {
    setPortalError(null);
    setPortalPending(true);
    try {
      const result = await api.createBillingPortal();
      window.location.href = result.url;
    } catch (err) {
      setPortalError(
        err instanceof Error ? err.message : "failed to open billing portal",
      );
      setPortalPending(false);
    }
  }

  // Delete-account two-step confirmation state.
  // Stage 1: initial "delete_account" button revealed.
  // Stage 2: email-typing confirmation form.
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState("");
  const deleteAccount = useDeleteAccount();

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

  async function handleDeleteAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;
    if (deleteConfirmEmail !== session.user.email) {
      setDeleteStatus("Error: email does not match");
      return;
    }
    setDeleteStatus(null);
    try {
      await deleteAccount.mutateAsync(session.user.email);
      // Best-effort sign-out on the Better Auth side too, the user
      // row was already deleted from the edgepush DB, so this is just
      // session cookie cleanup.
      await authClient.signOut().catch(() => {});
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

      <section className="mb-12 border border-rule-strong bg-surface">
        <PanelHead title="billing" />
        <div className="space-y-4 px-6 py-6">
          <p className="font-sans text-[14px] leading-[1.55] text-muted-strong">
            Manage your edgepush subscription. View invoices, update your
            payment method, or cancel your Pro plan. Free-tier users who
            haven&apos;t upgraded yet can start from the{" "}
            <a href="https://edgepush.dev/pricing" className="text-text underline decoration-accent underline-offset-4 hover:text-accent">
              pricing page
            </a>.
          </p>
          {portalError && (
            <p className="font-mono text-[12px] text-error">
              <span>●</span> {portalError}
            </p>
          )}
          <button
            onClick={handleManageSubscription}
            disabled={portalPending}
            className="inline-flex items-center gap-2 rounded-none bg-text px-4 py-2.5 font-mono text-[12px] font-semibold text-black hover:bg-accent disabled:opacity-50"
          >
            <span className="text-accent">$</span>{" "}
            {portalPending ? "redirecting..." : "manage_subscription"}
          </button>
        </div>
      </section>

      <section className="mt-20 border border-accent bg-surface">
        <div className="flex items-center justify-between border-b border-rule px-5 py-3 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
          <span>
            <span className="text-accent">├&nbsp;</span>
            <span className="text-accent">danger_zone</span>
          </span>
          <span className="text-accent">● irreversible</span>
        </div>
        <div className="space-y-4 px-6 py-6">
          <p className="font-sans text-[14px] leading-[1.55] text-muted-strong">
            Permanently delete your account and every app, credential,
            message, webhook, and subscription tied to it. This cannot be
            undone and the data cannot be recovered.
          </p>

          {!deleteConfirmOpen && (
            <button
              onClick={() => {
                setDeleteStatus(null);
                setDeleteConfirmOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-none bg-accent px-4 py-2.5 font-mono text-[12px] font-semibold text-black hover:bg-accent-hover"
            >
              <span>$</span> delete_account
            </button>
          )}

          {deleteConfirmOpen && (
            <form onSubmit={handleDeleteAccount} className="space-y-4">
              <div>
                <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                  type your email to confirm ({session.user.email})
                </label>
                <input
                  type="email"
                  autoFocus
                  required
                  value={deleteConfirmEmail}
                  onChange={(e) => setDeleteConfirmEmail(e.target.value)}
                  placeholder={session.user.email}
                  className="w-full rounded-none border border-rule-strong bg-bg px-4 py-2.5 font-mono text-[13px] text-text placeholder:text-muted focus:border-accent focus:outline-none"
                />
              </div>
              {deleteStatus && (
                <p className="font-mono text-[12px] text-accent">
                  <span>●</span> {deleteStatus}
                </p>
              )}
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={
                    deleteAccount.isPending ||
                    deleteConfirmEmail !== session.user.email
                  }
                  className="inline-flex items-center gap-2 rounded-none bg-accent px-4 py-2.5 font-mono text-[12px] font-semibold text-black hover:bg-accent-hover disabled:opacity-40"
                >
                  <span>$</span>{" "}
                  {deleteAccount.isPending
                    ? "deleting…"
                    : "confirm_delete"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteConfirmOpen(false);
                    setDeleteConfirmEmail("");
                    setDeleteStatus(null);
                  }}
                  className="font-mono text-[12px] uppercase tracking-[0.1em] text-muted hover:text-text"
                >
                  cancel
                </button>
              </div>
            </form>
          )}
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
