"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { SECTIONS } from "./sections";

export function Sidebar() {
  const pathname = usePathname();
  // /docs → no active section (index), /docs/foo → active = "foo"
  const activeSlug = pathname.startsWith("/docs/")
    ? pathname.split("/")[2]
    : null;

  return (
    <aside className="lg:sticky lg:top-10 lg:self-start">
      <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
        <span className="text-accent">─&nbsp;</span> contents
      </div>
      <ul className="flex flex-col gap-0.5 font-mono text-[12px]">
        {SECTIONS.map((s) => {
          const active = s.slug === activeSlug;
          return (
            <li key={s.slug}>
              <Link
                href={`/docs/${s.slug}`}
                className={`block py-1 ${
                  active ? "text-text" : "text-muted-strong hover:text-text"
                }`}
              >
                <span className={active ? "text-accent" : "text-rule-strong"}>
                  {active ? "├" : "│"}&nbsp;
                </span>
                {s.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
