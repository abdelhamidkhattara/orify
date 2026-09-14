import { NextResponse } from "next/server";
import { TURSO_DATABASE_URL } from "@/lib/config";

/** Quick prod check — no secrets returned. */
export async function GET() {
  const hasToken = Boolean(process.env.DATABASE_AUTH_TOKEN?.trim());
  const hasSession = Boolean(process.env.SESSION_SECRET?.trim());
  const hasEnc = Boolean(process.env.OWNER_ENCRYPTION_KEY?.trim());

  let dbOk = false;
  let dbError: string | null = null;
  let demoOk = false;

  if (hasToken) {
    try {
      const { createClient } = await import("@libsql/client");
      const c = createClient({
        url: TURSO_DATABASE_URL,
        authToken: process.env.DATABASE_AUTH_TOKEN!.trim(),
      });
      await c.execute("SELECT 1");
      dbOk = true;
      const demo = await c.execute(
        `SELECT status, shop_id FROM codes WHERE code = 'DEMO' LIMIT 1`,
      );
      demoOk =
        demo.rows.length > 0 &&
        String(demo.rows[0].status) === "live" &&
        Boolean(demo.rows[0].shop_id);
    } catch (e) {
      dbError = e instanceof Error ? e.message : "db failed";
    }
  }

  const ok = hasToken && hasSession && hasEnc && dbOk && demoOk;

  return NextResponse.json(
    {
      ok,
      appUrl: "https://orify.vercel.app",
      env: {
        DATABASE_AUTH_TOKEN: hasToken,
        SESSION_SECRET: hasSession,
        OWNER_ENCRYPTION_KEY: hasEnc,
      },
      tursoUrl: TURSO_DATABASE_URL,
      dbOk,
      demoOk,
      dbError,
    },
    { status: ok ? 200 : 503 },
  );
}
