import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/do.ts"],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "es2022",
  // Don't bundle deps - they'll be resolved at runtime by the
  // consuming worker (apps/app or apps/api).
  external: [
    "hono",
    "hono/*",
    "drizzle-orm",
    "drizzle-orm/*",
    "better-auth",
    "better-auth/*",
    "jose",
    "zod",
    "@edgepush/orpc",
    "cloudflare:workers",
  ],
});
