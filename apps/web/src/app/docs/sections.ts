/**
 * Ordered list of docs sections. Single source of truth for the
 * sidebar, the section index, and generateStaticParams.
 */

export interface DocSection {
  slug: string;
  label: string;
  n: string;
}

export const SECTIONS: DocSection[] = [
  { slug: "install", label: "install", n: "01" },
  { slug: "create-app", label: "create app", n: "02" },
  { slug: "credentials", label: "credentials", n: "03" },
  { slug: "ios", label: "ios client", n: "04" },
  { slug: "android", label: "android client", n: "05" },
  { slug: "react-native", label: "react native", n: "06" },
  { slug: "send", label: "send", n: "07" },
  { slug: "rich", label: "rich notifications", n: "08" },
  { slug: "receipts", label: "receipts", n: "09" },
  { slug: "webhooks", label: "webhooks", n: "10" },
  { slug: "errors", label: "error codes", n: "11" },
  { slug: "rate-limits", label: "rate limits", n: "12" },
  { slug: "auth", label: "api keys", n: "13" },
  { slug: "batch", label: "batch", n: "14" },
  { slug: "cli", label: "cli", n: "15" },
  { slug: "api", label: "rest api", n: "16" },
  { slug: "self-host", label: "self-host", n: "17" },
];
