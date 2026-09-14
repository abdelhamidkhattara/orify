import { NextResponse } from "next/server";
import { TURSO_DATABASE_URL } from "@/lib/config";

/** Quick prod check — no secrets returned. */
export async function GET() {
  const hasToken = Boolean(process.env.DATABASE_AUTH_TOKEN?.trim());
  const hasSession = Boolean(process.env.SESSION_SECRET?.trim());
  const hasEnc = Boolean(process.env.OWNER_ENCRYPTION_KEY?.trim());
  const hasOwnerPass = Boolean(process.env.OWNER_BOOTSTRAP_PASSWORD?.trim());

  let dbOk = false;
  let dbError: string | null = null;

  if (hasToken) {
    try {
      const { createClient } = await import("@libsql/client");
      const c = createClient({
        url: TURSO_DATABASE_URL,
        authToken: process.env.DATABASE_AUTH_TOKEN!.trim(),
      });
      await c.execute("SELECT 1");
      dbOk = true;
    } catch (e) {
      dbError = e instanceof Error ? e.message : "db failed";
    }
  }

  const ok = hasToken && hasSession && hasEnc && hasOwnerPass && dbOk;

  return NextResponse.json(
    {
      ok,
      env: {
        DATABASE_AUTH_TOKEN: hasToken,
        SESSION_SECRET: hasSession,
        OWNER_ENCRYPTION_KEY: hasEnc,
        OWNER_BOOTSTRAP_PASSWORD: hasOwnerPass,
      },
      tursoUrl: TURSO_DATABASE_URL,
      dbOk,
      dbError,
    },
    { status: ok ? 200 : 503 },
  );
}
