import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";

const CONFIG_DIR = join(homedir(), ".config", "edgepush");
const CONFIG_PATH = join(CONFIG_DIR, "config.json");

export interface CliConfig {
  /** Session token from OAuth login, used for admin commands. */
  sessionToken?: string;
  /** API key for send/receipt commands (tied to a specific app). */
  apiKey?: string;
  baseURL?: string;
}

export function loadConfig(): CliConfig {
  if (!existsSync(CONFIG_PATH)) return {};
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, "utf-8")) as CliConfig;
  } catch {
    return {};
  }
}

export function saveConfig(config: CliConfig): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), {
    mode: 0o600,
  });
}

export function getEffectiveConfig(): CliConfig {
  const fileConfig = loadConfig();
  return {
    sessionToken: fileConfig.sessionToken,
    apiKey: process.env.EDGEPUSH_API_KEY ?? fileConfig.apiKey,
    baseURL:
      process.env.EDGEPUSH_BASE_URL ??
      fileConfig.baseURL ??
      "https://app.edgepush.dev",
  };
}

export { CONFIG_PATH };
