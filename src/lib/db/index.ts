import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";
import path from "path";
import fs from "fs";
import { TURSO_DATABASE_URL } from "@/lib/config";

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

const client = makeClient();

export const db = drizzle(client, { schema });
export { client };
