"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useState } from "react";

import { useUploadApns } from "@/lib/queries";

export default function ApnsCredentialsPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(props.params);
  const router = useRouter();
  const uploadApns = useUploadApns(id);
  const [keyId, setKeyId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [production, setProduction] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await uploadApns.mutateAsync({
        keyId,
        teamId,
        privateKey,
        production,
      });
      router.push(`/dashboard/apps/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
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
        / <span className="text-text">credentials / apns</span>
      </div>

      <h1 className="mb-2 font-mono text-[36px] font-extrabold leading-[1.02] tracking-[-0.025em] text-text">
        apns credentials.
      </h1>
      <p className="mb-10 font-sans text-[14px] leading-[1.55] text-muted-strong">
        Upload your Apple Push Notification Service key. The .p8 file content
        is encrypted with AES-GCM before being stored in D1.
      </p>

      <form
        onSubmit={handleSubmit}
        className="space-y-0 border border-rule-strong bg-surface"
      >
        <div className="flex items-center justify-between border-b border-rule px-5 py-3 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
          <span>
            <span className="text-accent">├&nbsp;</span>
            <span className="text-text">upload_apns_key</span>
          </span>
          <span>
            <span className="text-accent">●</span> encrypted at rest
          </span>
        </div>
        <div className="space-y-5 px-6 py-6">
          <Field
            label="key_id"
            value={keyId}
            onChange={setKeyId}
            placeholder="ABC1234567"
          />
          <Field
            label="team_id"
            value={teamId}
            onChange={setTeamId}
            placeholder="DEF2345678"
          />
          <p className="font-mono text-[11px] tracking-[0.02em] text-muted">
            <span className="text-accent">●</span> bundle_id is derived from
            this app&apos;s package_name, no need to type it.
          </p>
          <div>
            <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
              p8_private_key
            </label>
            <textarea
              required
              value={privateKey}
              onChange={(e) => setPrivateKey(e.target.value)}
              rows={10}
              className="w-full rounded-none border border-rule-strong bg-bg px-4 py-3 font-mono text-[12px] text-text placeholder:text-muted focus:border-accent focus:outline-none"
              placeholder={
                "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
              }
            />
          </div>

          <label className="flex cursor-pointer items-center gap-3 font-mono text-[12px] text-muted-strong">
            <input
              type="checkbox"
              checked={production}
              onChange={(e) => setProduction(e.target.checked)}
              className="h-4 w-4 accent-accent"
            />
            <span>
              <span className="text-accent">●</span> production environment
              (uncheck for sandbox)
            </span>
          </label>

          {error && (
            <p className="font-mono text-[12px] text-error">
              <span>●</span> {error}
            </p>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={uploadApns.isPending}
              className="inline-flex items-center gap-2 rounded-none bg-text px-4 py-2.5 font-mono text-[12px] font-semibold text-black hover:bg-accent disabled:opacity-50"
            >
              <span className="text-accent">$</span>{" "}
              {uploadApns.isPending ? "saving..." : "save_credentials"}
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

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
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
        className="w-full rounded-none border border-rule-strong bg-transparent px-4 py-2.5 font-mono text-[13px] text-text placeholder:text-muted focus:border-accent focus:outline-none"
      />
    </div>
  );
}
