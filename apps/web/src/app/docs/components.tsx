/**
 * Shared doc page primitives. Used by both the section pages and the
 * docs index.
 */

import Link from "next/link";

export function Section({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-16">
      <div className="mb-4 flex items-baseline gap-3 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
        <span>
          <span className="text-accent">├&nbsp;</span>
          {n}
        </span>
      </div>
      <h2 className="mb-5 font-mono text-[26px] font-bold leading-[1.05] tracking-[-0.02em] text-text">
        {title}
      </h2>
      <div className="font-sans text-[15px] leading-[1.65] text-muted-strong">
        {children}
      </div>
    </div>
  );
}

export function Code({ children }: { children: string }) {
  return (
    <pre className="mt-4 overflow-x-auto border border-rule-strong bg-surface p-5 font-mono text-[13px] leading-[1.6] text-text">
      <code>{children}</code>
    </pre>
  );
}

export function ErrorRow({
  reason,
  invalid,
  action,
}: {
  reason: string;
  invalid: string;
  action: string;
}) {
  return (
    <tr className="border-b border-rule last:border-b-0">
      <td className="px-4 py-2 text-text">{reason}</td>
      <td
        className={`px-4 py-2 ${
          invalid === "true" ? "text-error" : "text-muted"
        }`}
      >
        {invalid}
      </td>
      <td className="px-4 py-2">{action}</td>
    </tr>
  );
}

export function PrevNext({
  prev,
  next,
}: {
  prev?: { slug: string; label: string };
  next?: { slug: string; label: string };
}) {
  return (
    <div className="mt-16 flex items-center justify-between border-t border-rule pt-6 font-mono text-[12px]">
      {prev ? (
        <Link
          href={`/docs/${prev.slug}`}
          className="text-muted-strong hover:text-text"
        >
          <span className="text-accent">←</span> {prev.label}
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link
          href={`/docs/${next.slug}`}
          className="text-muted-strong hover:text-text"
        >
          {next.label} <span className="text-accent">→</span>
        </Link>
      ) : (
        <span />
      )}
    </div>
  );
}
