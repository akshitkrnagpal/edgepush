import type { Db } from "./db";

export interface Env {
  DB: D1Database;
  CACHE: KVNamespace;
  DISPATCH_QUEUE: Queue<DispatchJob>;
  RATE_LIMITER: DurableObjectNamespace;

  BETTER_AUTH_URL: string;
  BETTER_AUTH_SECRET: string;
  ENCRYPTION_KEY: string;

  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
}

export interface AppContext {
  Bindings: Env;
  Variables: {
    db: Db;
  };
}

export interface DispatchJob {
  messageId: string;
  appId: string;
}
