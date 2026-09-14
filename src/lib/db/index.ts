import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema";
import path from "path";
import fs from "fs";
import { TURSO_DATABASE_URL } from "@/lib/config";

type AppDb = LibSQLDatabase<typeof schema>;

function isNextBuild() {
  return (
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.NEXT_PHASE === "phase-export"
  );
}

function resolveLocalFileUrl() {
  const abs = path.join(process.cwd(), "data", "orify.db");
  const dir = path.dirname(abs);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return `file:${abs}`;
}

function makeClient(): Client {
  const isProd = process.env.NODE_ENV === "production";
  const authToken = process.env.DATABASE_AUTH_TOKEN?.trim();

  if (isProd) {
    if (!authToken) {
      throw new Error(
        "DATABASE_AUTH_TOKEN is required in production (Turso token). Set it in Vercel → Settings → Environment Variables, then Redeploy.",
      );
    }
    return createClient({
      url: TURSO_DATABASE_URL,
      authToken,
    });
  }

  const override = process.env.DATABASE_URL?.trim();
  if (override?.startsWith("libsql:") || override?.startsWith("https:")) {
    return createClient({
      url: override,
      authToken,
    });
  }

  return createClient({ url: resolveLocalFileUrl() });
}

/**
 * `next build` runs with NODE_ENV=production — skip connecting (stubs).
 * Runtime (Vercel serverless / next start) creates a real client + Drizzle.
 */
function init(): { client: Client; db: AppDb } {
  const client = makeClient();
  const db = drizzle(client, { schema });
  return { client, db };
}

const pair = isNextBuild() ? null : init();

export const client = pair?.client as Client;
export const db = pair?.db as AppDb;
