# @edgepush/sdk

Official Node/TypeScript SDK for edgepush. Send native iOS and Android push notifications through a single API.

## Install

```bash
npm install @edgepush/sdk
# or
pnpm add @edgepush/sdk
# or
bun add @edgepush/sdk
```

## Quick start

```ts
import { Edgepush } from "@edgepush/sdk";

const client = new Edgepush({
  apiKey: "io.akshit.myapp|abc123...", // from the edgepush dashboard
});

// Send a single message
const ticket = await client.send({
  to: deviceToken, // APNs hex token or FCM registration token
  title: "Hello",
  body: "World",
  data: { url: "myapp://home" },
});

// Poll the delivery receipt
const receipt = await client.getReceipt(ticket.id);
console.log(receipt.status); // "queued" | "sending" | "delivered" | "failed" | "expired"
```

## Batch sends

```ts
const tickets = await client.sendBatch([
  { to: token1, title: "Hi", body: "First" },
  { to: token2, title: "Hi", body: "Second" },
]);

// Poll all receipts in a single call
const receipts = await client.getReceipts(tickets.map((t) => t.id));
```

## Environments

The SDK is isomorphic. It works in:

- Node.js (>= 18)
- Bun
- Deno
- Cloudflare Workers
- Browsers (CORS allowed, but you should rarely send pushes from a browser)

## Error handling

```ts
import { Edgepush, EdgepushError } from "@edgepush/sdk";

try {
  await client.send({ to: deviceToken, title: "Hi" });
} catch (err) {
  if (err instanceof EdgepushError) {
    console.error(`edgepush ${err.status}: ${err.code}`);
  }
  throw err;
}
```

## License

MIT
