import {
  EdgepushError,
  type EdgepushOptions,
  type PushMessage,
  type Receipt,
  type Ticket,
} from "./types";

const DEFAULT_BASE_URL = "https://api.edgepush.dev";

/**
 * Official edgepush client.
 *
 * ```ts
 * import { Edgepush } from "@edgepush/sdk";
 *
 * const client = new Edgepush({ apiKey: "io.akshit.myapp|abc..." });
 *
 * const tickets = await client.send({
 *   to: deviceToken,
 *   title: "Hello",
 *   body: "World",
 * });
 *
 * const receipt = await client.getReceipt(tickets[0].id);
 * ```
 */
export class Edgepush {
  private readonly apiKey: string;
  private readonly baseURL: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: EdgepushOptions) {
    if (!options.apiKey) {
      throw new Error("Edgepush: apiKey is required");
    }
    if (!options.apiKey.includes("|")) {
      throw new Error(
        "Edgepush: apiKey must be in the format <package_name>|<secret>",
      );
    }
    this.apiKey = options.apiKey;
    this.baseURL = (options.baseURL ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    this.fetchImpl = options.fetch ?? globalThis.fetch;
    if (!this.fetchImpl) {
      throw new Error(
        "Edgepush: fetch is not available. Pass a custom fetch via options.fetch.",
      );
    }
  }

  /**
   * Send a single push message. Returns a ticket with an id that can be
   * used to look up the delivery receipt.
   */
  async send(message: PushMessage): Promise<Ticket> {
    const result = await this.sendBatch([message]);
    return result[0]!;
  }

  /**
   * Send up to 100 messages in a single call.
   */
  async sendBatch(messages: PushMessage[]): Promise<Ticket[]> {
    if (messages.length === 0) return [];
    if (messages.length > 100) {
      throw new Error(
        `Edgepush: sendBatch supports up to 100 messages, got ${messages.length}`,
      );
    }

    const body = (await this.request("/v1/send", {
      method: "POST",
      body: JSON.stringify({ messages }),
    })) as { data: Ticket[] };

    return body.data;
  }

  /**
   * Fetch the delivery receipt for a single ticket id.
   */
  async getReceipt(id: string): Promise<Receipt> {
    return (await this.request(`/v1/receipts/${encodeURIComponent(id)}`)) as Receipt;
  }

  /**
   * Fetch delivery receipts for multiple ticket ids in a single call.
   * Up to 500 ids per call.
   */
  async getReceipts(ids: string[]): Promise<Receipt[]> {
    if (ids.length === 0) return [];
    if (ids.length > 500) {
      throw new Error(
        `Edgepush: getReceipts supports up to 500 ids, got ${ids.length}`,
      );
    }
    const body = (await this.request("/v1/receipts/batch", {
      method: "POST",
      body: JSON.stringify({ ids }),
    })) as { data: Receipt[] };
    return body.data;
  }

  private async request(
    path: string,
    init: RequestInit = {},
  ): Promise<unknown> {
    const res = await this.fetchImpl(`${this.baseURL}${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        "content-type": "application/json",
        ...init.headers,
      },
    });

    if (!res.ok) {
      let code: string | undefined;
      let message = `HTTP ${res.status}`;
      try {
        const body = (await res.json()) as { error?: string };
        if (body.error) {
          code = body.error;
          message = `${res.status} ${body.error}`;
        }
      } catch {
        const text = await res.text().catch(() => "");
        if (text) message = text;
      }
      throw new EdgepushError(message, res.status, code);
    }

    return res.json();
  }
}
