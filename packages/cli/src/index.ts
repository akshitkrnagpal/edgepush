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
  edgepush login                              Save an API key
  edgepush whoami                             Show the configured account
  edgepush send <token> [options]             Send a push notification
  edgepush receipt <id>                       Get a delivery receipt
  edgepush --help                             Show this help

Send options:
  --title <text>        Notification title
  --body <text>         Notification body
  --platform <ios|android>  Override auto-detection
  --sound <name>        Sound name or "default"
  --badge <n>           iOS badge count
  --data <json>         JSON-encoded custom data

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
    const apiKey = (await rl.question("API key: ")).trim();
    if (!apiKey) {
      console.error("No key entered, aborting.");
      process.exit(1);
    }
    if (!apiKey.includes("|")) {
      console.error("Invalid key format. Expected: <package_name>|<secret>");
      process.exit(1);
    }
    const baseURL =
      (
        await rl.question(
          "API base URL [https://api.edgepush.dev]: ",
        )
      ).trim() || "https://api.edgepush.dev";

    const existing = loadConfig();
    saveConfig({ ...existing, apiKey, baseURL });
    console.log(`Saved to ${CONFIG_PATH}`);
  } finally {
    rl.close();
  }
}

function cmdWhoami(): void {
  const { apiKey, baseURL } = getEffectiveConfig();
  if (!apiKey) {
    console.error("Not logged in. Run: edgepush login");
    process.exit(1);
  }
  const packageName = apiKey.slice(0, apiKey.indexOf("|"));
  console.log(`Package: ${packageName}`);
  console.log(`API URL: ${baseURL}`);
  console.log(`Key:     ${packageName}|${"*".repeat(12)}`);
}

async function cmdSend(args: ParsedArgs): Promise<void> {
  const { apiKey, baseURL } = getEffectiveConfig();
  if (!apiKey) {
    console.error("Not logged in. Run: edgepush login");
    process.exit(1);
  }

  const to = args.positional[0];
  if (!to) {
    console.error("Usage: edgepush send <device_token> [options]");
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

  const client = new Edgepush({ apiKey, baseURL });

  try {
    const ticket = await client.send({
      to,
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
}

async function cmdReceipt(args: ParsedArgs): Promise<void> {
  const { apiKey, baseURL } = getEffectiveConfig();
  if (!apiKey) {
    console.error("Not logged in. Run: edgepush login");
    process.exit(1);
  }

  const id = args.positional[0];
  if (!id) {
    console.error("Usage: edgepush receipt <ticket_id>");
    process.exit(1);
  }

  const client = new Edgepush({ apiKey, baseURL });

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
