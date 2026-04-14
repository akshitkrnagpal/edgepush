#!/usr/bin/env node
/**
 * edgepush CLI entry point.
 *
 * Commands:
 *   edgepush login               Save an API key to ~/.config/edgepush/config.json
 *   edgepush whoami              Show the currently configured API key
 *   edgepush send <token>        Send a push (with --title, --body, --data)
 *   edgepush receipt <id>        Get the delivery receipt for a ticket
 *   edgepush --help              Show this help
 */

import { Edgepush, EdgepushError } from "@edgepush/sdk";

import { CONFIG_PATH, getEffectiveConfig, loadConfig, saveConfig } from "./config";

interface ParsedArgs {
  command: string | undefined;
  positional: string[];
  flags: Record<string, string | boolean>;
}

function parseArgs(argv: string[]): ParsedArgs {
  const args = argv.slice(2);
  let command: string | undefined;
  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith("--")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else if (arg.startsWith("-")) {
      flags[arg.slice(1)] = true;
    } else if (command === undefined) {
      command = arg;
    } else {
      positional.push(arg);
    }
  }

  return { command, positional, flags };
}

function printHelp() {
  console.log(`edgepush CLI

Usage:
  edgepush login                              Sign in via browser (OAuth)
  edgepush whoami                             Show the configured account
  edgepush send <token> --app <id> [options]   Send to a device token
  edgepush send --topic <name> --app <id>     Send to an FCM topic
  edgepush receipt <id> --app <id>            Get a delivery receipt

Admin commands:
  edgepush apps list                          List your apps
  edgepush apps create <name> <package>       Create an app
  edgepush apps delete <id>                   Delete an app
  edgepush keys list <appId>                  List API keys for an app
  edgepush keys create <appId> [--label <l>]  Create a new API key
  edgepush keys revoke <appId> <keyId>        Revoke an API key

  edgepush --help                             Show this help

Send options:
  --app <id>                App ID (required, see 'edgepush apps list')
  --title <text>            Notification title
  --body <text>             Notification body
  --platform <ios|android>  Override auto-detection
  --topic <name>            FCM topic (instead of device token)
  --condition <expr>        FCM condition expression (instead of token)
  --sound <name>            Sound name or "default"
  --badge <n>               iOS badge count
  --data <json>             JSON-encoded custom data
  --image <url>             Image URL (rich notification, needs NSE on iOS)
  --collapse-id <id>        Collapse key (max 64 bytes)
  --priority <high|normal>  Delivery priority (default high)
  --ttl <seconds>           Time-to-live in seconds
  --expiration-at <unix>    Absolute Unix expiration timestamp (overrides ttl)
  --push-type <type>        APNs push type: alert, background, voip, location,
                            complication, fileprovider, mdm
  --mutable-content         Set iOS aps[mutable-content] = 1 (rich images)
  --content-available       Set iOS aps[content-available] = 1 (silent push)
  --time-sensitive          iOS time-sensitive interruption level

Environment variables:
  EDGEPUSH_API_KEY      Override the saved API key
  EDGEPUSH_BASE_URL     Override the API base URL

Config file: ~/.config/edgepush/config.json
`);
}

async function cmdLogin(): Promise<void> {
  const { createInterface } = await import("node:readline/promises");
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  try {
    const baseURL =
      (
        await rl.question(
          "API base URL [https://app.edgepush.dev]: ",
        )
      ).trim() || "https://app.edgepush.dev";

    console.log("\nOpening browser for sign-in...");
    console.log("Waiting for authorization...\n");

    const result = await browserAuth(baseURL);
    if (!result) {
      console.error("Authorization timed out or was cancelled.");
      process.exit(1);
    }

    const existing = loadConfig();
    saveConfig({
      ...existing,
      sessionToken: result.token,
      baseURL: result.baseURL,
    });
    console.log(`\nSaved to ${CONFIG_PATH}`);
    console.log("Logged in. Use 'edgepush apps list' to see your apps.");
  } finally {
    rl.close();
  }
}

async function browserAuth(
  baseURL: string,
): Promise<{ token: string; baseURL: string } | null> {
  const http = await import("node:http");

  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url ?? "/", `http://localhost`);
      if (url.pathname !== "/callback") {
        res.writeHead(404);
        res.end();
        return;
      }

      const token = url.searchParams.get("token");
      const returnedBaseURL = url.searchParams.get("base_url") ?? baseURL;

      res.writeHead(200, { "content-type": "text/html" });
      res.end(
        "<html><body style='background:#0a0a0a;color:#e5e5e5;font-family:monospace;display:flex;align-items:center;justify-content:center;height:100vh;margin:0'>" +
          "<p style='font-size:14px'><span style='color:#FF6B1A'>●</span> CLI authorized. You can close this tab.</p>" +
          "</body></html>",
      );

      server.close();

      if (token) {
        resolve({ token, baseURL: returnedBaseURL });
      } else {
        resolve(null);
      }
    });

    // Listen on a random port
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      if (!addr || typeof addr === "string") {
        resolve(null);
        return;
      }
      const port = addr.port;
      const authURL = `${baseURL}/cli/auth?port=${port}`;

      // Open browser
      openBrowser(authURL);
      console.log(`If the browser didn't open, visit:\n  ${authURL}\n`);
    });

    // Timeout after 5 minutes
    setTimeout(() => {
      server.close();
      resolve(null);
    }, 5 * 60 * 1000);
  });
}

async function openBrowser(url: string): Promise<void> {
  const { exec } = await import("node:child_process");
  const platform = process.platform;
  const cmd =
    platform === "darwin"
      ? "open"
      : platform === "win32"
        ? "start"
        : "xdg-open";
  exec(`${cmd} "${url}"`);
}

function cmdWhoami(): void {
  const config = getEffectiveConfig();
  if (!config.sessionToken && !config.apiKey) {
    console.error("Not logged in. Run: edgepush login");
    process.exit(1);
  }
  console.log(`API URL: ${config.baseURL}`);
  if (config.sessionToken) {
    console.log(`Auth:    session token (OAuth)`);
  }
  if (config.apiKey) {
    const packageName = config.apiKey.slice(0, config.apiKey.indexOf("|"));
    console.log(`API Key: ${packageName}|${"*".repeat(12)}`);
  }
}

async function cmdSend(args: ParsedArgs): Promise<void> {
  const config = getEffectiveConfig();
  const token = config.apiKey ?? config.sessionToken;
  if (!token) {
    console.error("Not logged in. Run: edgepush login");
    process.exit(1);
  }
  const { baseURL } = config;

  // When using session token (not API key), --app is required
  const appId = typeof args.flags.app === "string" ? args.flags.app : undefined;
  if (!config.apiKey && !appId) {
    console.error("--app <appId> is required when using session auth.\nRun 'edgepush apps list' to see your apps.");
    process.exit(1);
  }

  const to = args.positional[0] || undefined;
  const topicFlag =
    typeof args.flags.topic === "string" ? args.flags.topic : undefined;
  const conditionFlag =
    typeof args.flags.condition === "string" ? args.flags.condition : undefined;

  // Exactly one target must be set.
  const targets = [to, topicFlag, conditionFlag].filter(Boolean);
  if (targets.length === 0) {
    console.error(
      "Usage: edgepush send <device_token> [options]\n" +
        "   or: edgepush send --topic <name> [options]\n" +
        "   or: edgepush send --condition <expr> [options]",
    );
    process.exit(1);
  }
  if (targets.length > 1) {
    console.error(
      "Only one of <token>, --topic, or --condition can be set at a time",
    );
    process.exit(1);
  }

  let data: Record<string, unknown> | undefined;
  if (typeof args.flags.data === "string") {
    try {
      data = JSON.parse(args.flags.data);
    } catch {
      console.error("--data must be valid JSON");
      process.exit(1);
    }
  }

  const validPushTypes = new Set([
    "alert",
    "background",
    "voip",
    "location",
    "complication",
    "fileprovider",
    "mdm",
  ]);
  const pushTypeFlag =
    typeof args.flags["push-type"] === "string"
      ? args.flags["push-type"]
      : undefined;
  if (pushTypeFlag && !validPushTypes.has(pushTypeFlag)) {
    console.error(
      `--push-type must be one of: ${[...validPushTypes].join(", ")}`,
    );
    process.exit(1);
  }

  const priorityFlag =
    args.flags.priority === "high" || args.flags.priority === "normal"
      ? args.flags.priority
      : undefined;

  // If using API key, use the SDK directly. Otherwise, use fetch with
  // session token + X-Edgepush-App header.
  if (config.apiKey) {
    const client = new Edgepush({ apiKey: config.apiKey, baseURL });
    try {
      const ticket = await client.send({
        to,
        topic: topicFlag,
        condition: conditionFlag,
        title:
          typeof args.flags.title === "string" ? args.flags.title : undefined,
        body: typeof args.flags.body === "string" ? args.flags.body : undefined,
        platform:
          args.flags.platform === "ios"
            ? "ios"
            : args.flags.platform === "android"
              ? "android"
              : undefined,
        sound:
          typeof args.flags.sound === "string" ? args.flags.sound : undefined,
        badge:
          typeof args.flags.badge === "string"
            ? Number(args.flags.badge)
            : undefined,
        data,
        image: typeof args.flags.image === "string" ? args.flags.image : undefined,
        collapseId:
          typeof args.flags["collapse-id"] === "string"
            ? args.flags["collapse-id"]
            : undefined,
        priority: priorityFlag,
        ttl:
          typeof args.flags.ttl === "string" ? Number(args.flags.ttl) : undefined,
        expirationAt:
          typeof args.flags["expiration-at"] === "string"
            ? Number(args.flags["expiration-at"])
            : undefined,
        pushType: pushTypeFlag as any,
        mutableContent: args.flags["mutable-content"] === true ? true : undefined,
        contentAvailable:
          args.flags["content-available"] === true ? true : undefined,
        timeSensitive:
          args.flags["time-sensitive"] === true ? true : undefined,
      });
      console.log(JSON.stringify(ticket, null, 2));
    } catch (err) {
      if (err instanceof EdgepushError) {
        console.error(`edgepush ${err.status}: ${err.message}`);
      } else {
        console.error(err instanceof Error ? err.message : err);
      }
      process.exit(1);
    }
    return;
  }

  // Session token auth: call /v1/send directly with X-Edgepush-App header
  const msg: Record<string, unknown> = {};
  if (to) msg.to = to;
  if (topicFlag) msg.topic = topicFlag;
  if (conditionFlag) msg.condition = conditionFlag;
  if (typeof args.flags.title === "string") msg.title = args.flags.title;
  if (typeof args.flags.body === "string") msg.body = args.flags.body;
  if (args.flags.platform === "ios" || args.flags.platform === "android") msg.platform = args.flags.platform;
  if (typeof args.flags.sound === "string") msg.sound = args.flags.sound;
  if (typeof args.flags.badge === "string") msg.badge = Number(args.flags.badge);
  if (data) msg.data = data;
  if (typeof args.flags.image === "string") msg.image = args.flags.image;
  if (typeof args.flags["collapse-id"] === "string") msg.collapseId = args.flags["collapse-id"];
  if (priorityFlag) msg.priority = priorityFlag;
  if (typeof args.flags.ttl === "string") msg.ttl = Number(args.flags.ttl);
  if (typeof args.flags["expiration-at"] === "string") msg.expirationAt = Number(args.flags["expiration-at"]);
  if (pushTypeFlag) msg.pushType = pushTypeFlag;
  if (args.flags["mutable-content"] === true) msg.mutableContent = true;
  if (args.flags["content-available"] === true) msg.contentAvailable = true;
  if (args.flags["time-sensitive"] === true) msg.timeSensitive = true;

  try {
    const res = await fetch(`${baseURL}/v1/send`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        "x-edgepush-app": appId!,
      },
      body: JSON.stringify({ messages: [msg] }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`${res.status}: ${text}`);
      process.exit(1);
    }
    const result = await res.json();
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
  return;
}

async function cmdReceipt(args: ParsedArgs): Promise<void> {
  const config = getEffectiveConfig();
  const token = config.apiKey ?? config.sessionToken;
  if (!token) {
    console.error("Not logged in. Run: edgepush login");
    process.exit(1);
  }

  const id = args.positional[0];
  if (!id) {
    console.error("Usage: edgepush receipt <ticket_id> [--app <appId>]");
    process.exit(1);
  }

  const appId = typeof args.flags.app === "string" ? args.flags.app : undefined;
  if (!config.apiKey && !appId) {
    console.error("--app <appId> is required when using session auth.");
    process.exit(1);
  }

  if (config.apiKey) {
    const client = new Edgepush({ apiKey: config.apiKey, baseURL: config.baseURL });
    try {
      const receipt = await client.getReceipt(id);
      console.log(JSON.stringify(receipt, null, 2));
    } catch (err) {
      if (err instanceof EdgepushError) {
        console.error(`edgepush ${err.status}: ${err.message}`);
      } else {
        console.error(err instanceof Error ? err.message : err);
      }
      process.exit(1);
    }
    return;
  }

  // Session token auth
  try {
    const res = await fetch(`${config.baseURL}/v1/receipts/${id}`, {
      headers: {
        authorization: `Bearer ${token}`,
        "x-edgepush-app": appId!,
      },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`${res.status}: ${text}`);
      process.exit(1);
    }
    const result = await res.json();
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

// --- Admin helpers ---

async function dashboardRequest<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const config = getEffectiveConfig();
  const token = config.sessionToken ?? config.apiKey;
  if (!token) {
    console.error("Not logged in. Run: edgepush login");
    process.exit(1);
  }

  const res = await fetch(`${config.baseURL}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(`${res.status}: ${text}`);
    process.exit(1);
  }

  return (await res.json()) as T;
}

async function cmdApps(args: ParsedArgs): Promise<void> {
  const sub = args.positional[0];

  if (sub === "list" || !sub) {
    const result = await dashboardRequest<{ data: Array<{ id: string; name: string; packageName: string }> }>(
      "GET",
      "/api/dashboard/apps",
    );
    if (result.data.length === 0) {
      console.log("no apps");
      return;
    }
    for (const app of result.data) {
      console.log(`${app.id}  ${app.packageName}  ${app.name}`);
    }
    return;
  }

  if (sub === "create") {
    const name = args.positional[1];
    const packageName = args.positional[2];
    if (!name || !packageName) {
      console.error("Usage: edgepush apps create <name> <packageName>");
      process.exit(1);
    }
    const result = await dashboardRequest<{ id: string }>(
      "POST",
      "/api/dashboard/apps",
      { name, packageName },
    );
    console.log(`created: ${result.id}`);
    return;
  }

  if (sub === "delete") {
    const id = args.positional[1];
    if (!id) {
      console.error("Usage: edgepush apps delete <appId>");
      process.exit(1);
    }
    await dashboardRequest<{ ok: boolean }>("DELETE", `/api/dashboard/apps/${id}`);
    console.log("deleted");
    return;
  }

  console.error(`Unknown apps subcommand: ${sub}`);
  process.exit(1);
}

async function cmdKeys(args: ParsedArgs): Promise<void> {
  const sub = args.positional[0];
  const appId = args.positional[1];

  if (sub === "list") {
    if (!appId) {
      console.error("Usage: edgepush keys list <appId>");
      process.exit(1);
    }
    const result = await dashboardRequest<{ data: Array<{ id: string; label: string; preview: string; createdAt: number }> }>(
      "GET",
      `/api/dashboard/apps/${appId}/api-keys`,
    );
    if (result.data.length === 0) {
      console.log("no keys");
      return;
    }
    for (const key of result.data) {
      console.log(`${key.id}  ${key.preview}...  ${key.label}`);
    }
    return;
  }

  if (sub === "create") {
    if (!appId) {
      console.error("Usage: edgepush keys create <appId> [--label <label>]");
      process.exit(1);
    }
    const label =
      typeof args.flags.label === "string" ? args.flags.label : "cli";
    const result = await dashboardRequest<{ id: string; apiKey: string; label: string }>(
      "POST",
      `/api/dashboard/apps/${appId}/api-keys`,
      { label },
    );
    console.log(`key created: ${result.apiKey}`);
    console.log("copy this key now, you won't see it again.");
    return;
  }

  if (sub === "revoke") {
    const keyId = args.positional[2];
    if (!appId || !keyId) {
      console.error("Usage: edgepush keys revoke <appId> <keyId>");
      process.exit(1);
    }
    await dashboardRequest<{ ok: boolean }>(
      "POST",
      `/api/dashboard/apps/${appId}/api-keys/${keyId}/revoke`,
    );
    console.log("revoked");
    return;
  }

  console.error(`Unknown keys subcommand: ${sub}`);
  process.exit(1);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv);

  if (args.flags.help || args.flags.h || args.command === "help") {
    printHelp();
    return;
  }

  switch (args.command) {
    case "login":
      await cmdLogin();
      break;
    case "whoami":
      cmdWhoami();
      break;
    case "send":
      await cmdSend(args);
      break;
    case "receipt":
      await cmdReceipt(args);
      break;
    case "apps":
      await cmdApps(args);
      break;
    case "keys":
      await cmdKeys(args);
      break;
    default:
      printHelp();
      if (args.command) {
        console.error(`\nUnknown command: ${args.command}`);
        process.exit(1);
      }
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
