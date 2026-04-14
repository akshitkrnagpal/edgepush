import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Bundle @edgepush/server at build time so it's included in the
  // OpenNext output. Without this, the workspace package isn't
  // resolvable at runtime in the workerd environment.
  transpilePackages: ["@edgepush/server", "@edgepush/orpc"],
};

export default nextConfig;
