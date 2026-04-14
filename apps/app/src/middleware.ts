/**
 * Edge middleware for the apps/app Next.js worker.
 *
 * On the hosted domain (app.edgepush.dev), redirects "/" to "/dashboard"
 * so there's no homepage on the SaaS. Guests who aren't logged in
 * will be redirected to /sign-in by the dashboard layout's auth check.
 *
 * On self-hosted / demo domains, "/" renders the self-host welcome page
 * (the default page.tsx component).
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const HOSTED_DOMAINS = new Set([
  "app.edgepush.dev",
  "www.app.edgepush.dev",
]);

export function middleware(req: NextRequest) {
  const hostname = (req.headers.get("host") ?? "").split(":")[0];

  if (HOSTED_DOMAINS.has(hostname) && req.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/"],
};
