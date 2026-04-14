#!/usr/bin/env node
/**
 * Bump @edgepush/sdk and @edgepush/cli to a new version, commit, and tag.
 *
 * Usage:
 *   node scripts/release.mjs 0.1.1
 *   node scripts/release.mjs patch
 *   node scripts/release.mjs minor
 *   node scripts/release.mjs major
 *
 * After this script runs, push the tag to trigger the Release workflow:
 *   git push origin main && git push origin v<version>
 */

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const PACKAGES = ["packages/sdk/package.json", "packages/cli/package.json"];

function bump(current, kind) {
  if (/^\d+\.\d+\.\d+/.test(kind)) return kind;
  const [major, minor, patch] = current.split(".").map(Number);
  if (kind === "patch") return `${major}.${minor}.${patch + 1}`;
  if (kind === "minor") return `${major}.${minor + 1}.0`;
  if (kind === "major") return `${major + 1}.0.0`;
  throw new Error(`Unknown bump: ${kind}`);
}

const arg = process.argv[2];
if (!arg) {
  console.error("Usage: node scripts/release.mjs <patch|minor|major|x.y.z>");
  process.exit(1);
}

const sdk = JSON.parse(readFileSync(PACKAGES[0], "utf8"));
const next = bump(sdk.version, arg);

for (const path of PACKAGES) {
  const pkg = JSON.parse(readFileSync(path, "utf8"));
  pkg.version = next;
  writeFileSync(path, JSON.stringify(pkg, null, 2) + "\n");
  console.log(`${pkg.name} -> ${next}`);
}

execSync(`git add ${PACKAGES.join(" ")}`, { stdio: "inherit" });
execSync(`git commit -m "Release v${next}"`, { stdio: "inherit" });
execSync(`git tag v${next}`, { stdio: "inherit" });

console.log(`\nNext: git push origin main && git push origin v${next}`);
