import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema";
import path from "path";
import fs from "fs";
import { TURSO_DATABASE_URL } from "@/lib/config";

type AppDb = LibSQLDatabase<typeof schema>;

function resolveLocalFileUrl() {
  const abs = path.join(process.cwd(), "data", "orify.db");
  const dir = path.dirname(abs);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return `file:${abs}`;
}

function makeClient(): Client {
  const isProd = process.env.NODE_ENV === "production";
  const authToken = process.env.DATABASE_AUTH_TOKEN?.trim();

  // Production → Turso (URL hardcoded, token from env)
  if (isProd) {
    if (!authToken) {
      throw new Error(
        "DATABASE_AUTH_TOKEN is required in production (Turso token)",
      );
    }
    return createClient({
      url: TURSO_DATABASE_URL,
      authToken,
    });
  }

  // Optional: point local at Turso by setting DATABASE_URL + token
  const override = process.env.DATABASE_URL?.trim();
  if (override?.startsWith("libsql:") || override?.startsWith("https:")) {
    return createClient({
      url: override,
      authToken,
    });
  }

  return createClient({ url: resolveLocalFileUrl() });
}

let _client: Client | null = null;
let _db: AppDb | null = null;

function getClient(): Client {
  if (!_client) _client = makeClient();
  return _client;
}

function getDb(): AppDb {
  if (!_db) _db = drizzle(getClient(), { schema });
  return _db;
}

/** Lazy — safe to import during `next build` (no connection until first use). */
export const client = new Proxy({} as Client, {
  get(_target, prop, receiver) {
    const c = getClient();
    const value = Reflect.get(c, prop, receiver);
    return typeof value === "function" ? value.bind(c) : value;
  },
});

/** Lazy — safe to import during `next build` (no connection until first use). */
export const db = new Proxy({} as AppDb, {
  get(_target, prop, receiver) {
    const d = getDb();
    const value = Reflect.get(d, prop, receiver);
    return typeof value === "function" ? value.bind(d) : value;
  },
});
