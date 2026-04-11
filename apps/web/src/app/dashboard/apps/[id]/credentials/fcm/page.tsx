"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useState } from "react";

import { useUploadFcm } from "@/lib/queries";

export default function FcmCredentialsPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(props.params);
  const router = useRouter();
  const uploadFcm = useUploadFcm(id);
  const [projectId, setProjectId] = useState("");
  const [serviceAccountJson, setServiceAccountJson] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      // Auto-extract project_id if the user just pastes the JSON
      if (!projectId && serviceAccountJson) {
        try {
          const parsed = JSON.parse(serviceAccountJson);
          if (parsed.project_id) setProjectId(parsed.project_id);
        } catch {
          // ignore
        }
      }

      await uploadFcm.mutateAsync({
        projectId:
          projectId ||
          (() => {
            try {
              return JSON.parse(serviceAccountJson).project_id ?? "";
            } catch {
              return "";
            }
          })(),
        serviceAccountJson,
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
        / <span className="text-text">credentials / fcm</span>
      </div>

      <h1 className="mb-2 font-mono text-[36px] font-extrabold leading-[1.02] tracking-[-0.025em] text-text">
        fcm credentials.
      </h1>
      <p className="mb-10 font-sans text-[14px] leading-[1.55] text-muted-strong">
        Upload your Firebase service account JSON. The file is encrypted with
        AES-GCM before being stored in D1. Project ID is auto-extracted.
      </p>

      <form
        onSubmit={handleSubmit}
        className="border border-rule-strong bg-surface"
      >
        <div className="flex items-center justify-between border-b border-rule px-5 py-3 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
          <span>
            <span className="text-accent">├&nbsp;</span>
            <span className="text-text">upload_fcm_service_account</span>
          </span>
          <span>
            <span className="text-accent">●</span> encrypted at rest
          </span>
        </div>
        <div className="space-y-5 px-6 py-6">
          <div>
            <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
              project_id (optional, auto-extracted)
            </label>
            <input
              type="text"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full rounded-none border border-rule-strong bg-transparent px-4 py-2.5 font-mono text-[13px] text-text placeholder:text-muted focus:border-accent focus:outline-none"
              placeholder="my-firebase-project"
            />
          </div>

          <div>
            <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
              service_account_json
            </label>
            <textarea
              required
              value={serviceAccountJson}
              onChange={(e) => setServiceAccountJson(e.target.value)}
              rows={14}
              className="w-full rounded-none border border-rule-strong bg-bg px-4 py-3 font-mono text-[12px] text-text placeholder:text-muted focus:border-accent focus:outline-none"
              placeholder={
                '{\n  "type": "service_account",\n  "project_id": "...",\n  ...\n}'
              }
            />
          </div>

          {error && (
            <p className="font-mono text-[12px] text-error">
              <span>●</span> {error}
            </p>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={uploadFcm.isPending}
              className="inline-flex items-center gap-2 rounded-none bg-text px-4 py-2.5 font-mono text-[12px] font-semibold text-black hover:bg-accent disabled:opacity-50"
            >
              <span className="text-accent">$</span>{" "}
              {uploadFcm.isPending ? "saving..." : "save_credentials"}
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
