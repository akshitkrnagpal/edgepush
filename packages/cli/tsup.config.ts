import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: false,
  sourcemap: true,
  clean: true,
  target: "node20",
  // Bundle @edgepush/sdk into the CLI so installs are a single package.
  noExternal: ["@edgepush/sdk"],
  // Source file has a shebang; tsup preserves it and chmods the output.
});
