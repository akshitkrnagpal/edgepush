/**
 * Edge proxy for the apps/web Next.js app. (Next.js 16 renamed
 * `middleware` to `proxy`; same model, new file convention.)
 *
 * Today this only does one thing: when the request lands on the
 * self-host marketing worker (selfhost.edgepush.dev or any host whose
 * subdomain starts with "selfhost"), rewrite the root path "/" to
 * "/selfhost" so visitors see the self-host landing without seeing
 * /selfhost in the URL.
 *
 * The same Next.js bundle is deployed as two workers via two wrangler
 * configs (wrangler.jsonc → edgepush-web and wrangler.selfhost.jsonc
 * → edgepush-selfhost-marketing). The hostname is the only signal we
 * use to differentiate them.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(req: NextRequest) {
  const hostname = req.headers.get("host") ?? "";
  const isSelfHostMarketing = hostname.startsWith("selfhost.");

  if (isSelfHostMarketing && req.nextUrl.pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = "/selfhost";
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

// Only run on the root path. Every other route on the self-host worker
// (sign-in, dashboard, etc.) still works — visitors can navigate to
// them directly. We just don't want / to land on the SaaS landing.
export const config = {
  matcher: ["/"],
};
