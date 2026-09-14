"use server";

import { eq, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { agents, codes, shops } from "@/lib/db/schema";
import {
  verifyPassword,
  createAgentSession,
  getAgentSession,
  clearAgentSession,
} from "@/lib/auth";
import { generateUniqueCodes } from "@/lib/codes";
import { newId, qrLink } from "@/lib/utils";
import { rateLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { normalizeDzPhone } from "@/lib/phones";

export async function requireAgent() {
  const session = await getAgentSession();
  if (!session) return null;
  const [agent] = await db
    .select()
    .from(agents)
    .where(eq(agents.id, session.agentId))
    .limit(1);
  if (!agent) return null;
  return { session, agent };
}

export async function sellerLogin(input: {
  identifier: string;
  password: string;
}) {
  const h = await headers();
  const ip = h.get("x-forwarded-for") || "local";
  const rl = rateLimit(`seller-login:${ip}`, 5, 15 * 60 * 1000);
  if (!rl.ok) return { ok: false as const, error: "rate" };

  const id = input.identifier.trim();
  const password = input.password;
  if (!id || !password) return { ok: false as const, error: "bad" };

  const phoneNorm = normalizeDzPhone(id);
  const allAgents = await db.select().from(agents);
  const agent = allAgents.find((a) => {
    if (a.name.trim().toLowerCase() === id.toLowerCase()) return true;
    if (a.phone && phoneNorm && normalizeDzPhone(a.phone) === phoneNorm) {
      return true;
    }
    if (a.phone && a.phone.replace(/\D/g, "") === id.replace(/\D/g, "")) {
      return true;
    }
    return false;
  });

  if (!agent?.passwordHash) return { ok: false as const, error: "bad" };
  const ok = await verifyPassword(password, agent.passwordHash);
  if (!ok) return { ok: false as const, error: "bad" };

  await createAgentSession(agent.id);
  revalidatePath("/seller");
  return { ok: true as const };
}

export async function sellerLogout() {
  await clearAgentSession();
  revalidatePath("/seller");
}

export async function listMyCodes() {
  const ctx = await requireAgent();
  if (!ctx) return { unused: [], live: [] };

  const myCodes = await db
    .select()
    .from(codes)
    .where(eq(codes.agentId, ctx.agent.id))
    .orderBy(desc(codes.createdAt));

  const shopRows = await db.select().from(shops);
  const unused = myCodes
    .filter((c) => c.status === "unused")
    .map((c) => ({
      id: c.id,
      code: c.code,
      link: qrLink(c.code),
      createdAt: c.createdAt,
    }));

  const live = myCodes
    .filter((c) => c.status === "live" && c.shopId)
    .map((c) => {
      const shop = shopRows.find((s) => s.id === c.shopId);
      return {
        id: c.id,
        code: c.code,
        link: qrLink(c.code),
        shopName: shop?.name || c.code,
        claimedAt: c.claimedAt,
      };
    });

  return { unused, live };
}

export async function createMyCode() {
  const ctx = await requireAgent();
  if (!ctx) return { ok: false as const, error: "auth" };

  const existing = new Set(
    (await db.select({ code: codes.code }).from(codes)).map((r) => r.code),
  );
  const [created] = generateUniqueCodes(1, existing);
  if (!created) return { ok: false as const, error: "gen" };

  const now = new Date();
  await db.insert(codes).values({
    id: newId(),
    code: created,
    status: "unused",
    agentId: ctx.agent.id,
    createdAt: now,
  });

  revalidatePath("/seller");
  return { ok: true as const, code: created };
}

export async function canAccessSalesPrint(code: string) {
  const [row] = await db
    .select()
    .from(codes)
    .where(eq(codes.code, code.toUpperCase()))
    .limit(1);
  if (!row || row.status !== "unused") return null;

  const { getOwnerSession } = await import("@/lib/auth");
  const owner = await getOwnerSession();
  if (owner) return row;

  const ctx = await requireAgent();
  if (ctx && row.agentId === ctx.agent.id) return row;
  return null;
}
