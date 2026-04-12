import Link from "next/link";

import { SECTIONS } from "./sections";

export default function DocsIndex() {
  return (
    <div>
      <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
        <span className="text-accent">$&nbsp;</span> man edgepush
      </div>
      <h1 className="mb-4 font-mono text-[56px] font-extrabold leading-[0.95] tracking-[-0.035em] text-text">
        docs.
      </h1>
      <p className="mb-14 max-w-xl font-sans text-[17px] leading-[1.55] text-muted-strong">
        Everything you need to send push notifications with edgepush. Five
        minutes from API key to first ticket.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map((s) => (
          <Link
            key={s.slug}
            href={`/docs/${s.slug}`}
            className="block border border-rule-strong bg-surface px-5 py-4 hover:border-text"
          >
            <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
              <span className="text-accent">├&nbsp;</span>
              {s.n}
            </div>
            <div className="font-mono text-[14px] font-bold text-text">
              {s.label}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
