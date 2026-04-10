# @edgepush/cli

Command line interface for edgepush. Send push notifications from your terminal.

## Install

```bash
npm install -g @edgepush/cli
# or
pnpm add -g @edgepush/cli
# or
bun add -g @edgepush/cli
```

## Login

```bash
edgepush login
# Enter your API key: io.akshit.myapp|abc...
# Enter API base URL [https://api.edgepush.dev]:
```

Stored in `~/.config/edgepush/config.json` (mode 600).

## Send a push

```bash
edgepush send DEVICE_TOKEN \
  --title "Hello" \
  --body "From the command line" \
  --data '{"url":"myapp://home"}'
```

## Get a receipt

```bash
edgepush receipt abc123-ticket-id
```

## All commands

```
edgepush login                              Save an API key
edgepush whoami                             Show the configured account
edgepush send <token> [options]             Send a push notification
edgepush receipt <id>                       Get a delivery receipt
edgepush --help                             Show help
```

## Environment variables

| Variable | Purpose |
|---|---|
| `EDGEPUSH_API_KEY` | Override the saved API key |
| `EDGEPUSH_BASE_URL` | Override the API base URL |

## License

MIT
