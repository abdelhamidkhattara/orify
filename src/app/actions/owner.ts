"use server";

import { eq, desc, and, like, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  codes,
  shops,
  leads,
  agents,
  ownerSettings,
  shopButtons,
  shopTargets,
  BUTTON_TYPES,
  THEME_PRESETS,
} from "@/lib/db/schema";
import {
  verifyPassword,
  createOwnerSession,
  getOwnerSession,
  clearOwnerSession,
  hashPassword,
  impersonateShop,
} from "@/lib/auth";
import { encryptPassword, decryptPassword } from "@/lib/crypto";
import { generateUniqueCodes } from "@/lib/codes";
import { newId, qrLink } from "@/lib/utils";
import { rateLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function requireOwner() {
  const s = await getOwnerSession();
  if (!s) return null;
  return s;
}

export async function ownerLogin(password: string) {
  const h = await headers();
  const ip = h.get("x-forwarded-for") || "local";
  const rl = rateLimit(`owner-login:${ip}`, 5, 15 * 60 * 1000);
  if (!rl.ok) return { ok: false as const, error: "rate" };

  const [row] = await db
    .select()
    .from(ownerSettings)
    .where(eq(ownerSettings.id, "main"))
    .limit(1);
  if (!row) return { ok: false as const, error: "bad" };
  const ok = await verifyPassword(password, row.passwordHash);
  if (!ok) return { ok: false as const, error: "bad" };
  await createOwnerSession();
  return { ok: true as const };
}

export async function ownerLogout() {
  await clearOwnerSession();
}

export async function getOwnerStats() {
  const auth = await requireOwner();
  if (!auth) {
    return {
      live: 0,
      unused: 0,
      disabled: 0,
      newLeads: 0,
      recent: [] as (typeof shops.$inferSelect)[],
      openLeads: [] as (typeof leads.$inferSelect)[],
    };
  }
  const allCodes = await db.select().from(codes);
  const allShops = await db.select().from(shops);
  const allLeads = await db.select().from(leads);
  return {
    live: allCodes.filter((c) => c.status === "live").length,
    unused: allCodes.filter((c) => c.status === "unused").length,
    disabled: allCodes.filter((c) => c.status === "disabled").length,
    newLeads: allLeads.filter((l) => l.status === "new").length,
    recent: allShops
      .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))
      .slice(0, 8),
    openLeads: allLeads
      .filter((l) => l.status === "new")
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
      .slice(0, 8),
  };
}

export async function listCodes(filter?: string) {
  const auth = await requireOwner();
  if (!auth) return [];
  let rows = await db.select().from(codes).orderBy(desc(codes.createdAt));
  if (filter === "unused" || filter === "live" || filter === "disabled") {
    rows = rows.filter((r) => r.status === filter);
  }
  const shopRows = await db.select().from(shops);
  const agentRows = await db.select().from(agents);
  return rows.map((c) => {
    const shop = shopRows.find((s) => s.id === c.shopId);
    const agent = agentRows.find((a) => a.id === c.agentId);
    return {
      ...c,
      shopName: shop?.name || null,
      agentName: agent?.name || null,
      link: qrLink(c.code),
    };
  });
}

export async function generateCodes(input: {
  count: number;
  agentId?: string | null;
  note?: string;
}) {
  const auth = await requireOwner();
  if (!auth) return { ok: false as const, codes: [] as string[] };
  const count = Math.min(50, Math.max(1, input.count || 1));
  const existing = new Set(
    (await db.select({ code: codes.code }).from(codes)).map((r) => r.code),
  );
  const created = generateUniqueCodes(count, existing);
  const now = new Date();
  const out: string[] = [];
  for (const code of created) {
    await db.insert(codes).values({
      id: newId(),
      code,
      status: "unused",
      agentId: input.agentId || null,
      note: input.note || null,
      createdAt: now,
    });
    out.push(code);
  }
  revalidatePath("/owner");
  return { ok: true as const, codes: out };
}

export async function setCodeStatus(
  codeId: string,
  status: "unused" | "live" | "disabled",
) {
  const auth = await requireOwner();
  if (!auth) return { ok: false as const };
  const [row] = await db.select().from(codes).where(eq(codes.id, codeId)).limit(1);
  if (!row) return { ok: false as const };
  if (row.code === "DEMO" && status !== "live") {
    return { ok: false as const, error: "DEMO locked" };
  }
  await db.update(codes).set({ status }).where(eq(codes.id, codeId));
  revalidatePath("/owner");
  return { ok: true as const };
}

export async function assignCodeAgent(codeId: string, agentId: string | null) {
  const auth = await requireOwner();
  if (!auth) return { ok: false as const };
  await db.update(codes).set({ agentId }).where(eq(codes.id, codeId));
  revalidatePath("/owner");
  return { ok: true as const };
}

export async function listShopsForOwner() {
  const auth = await requireOwner();
  if (!auth) return [];
  const shopRows = await db.select().from(shops).orderBy(desc(shops.updatedAt));
  const codeRows = await db.select().from(codes);
  const agentRows = await db.select().from(agents);
  return shopRows.map((s) => {
    const code = codeRows.find((c) => c.id === s.codeId);
    const agent = code ? agentRows.find((a) => a.id === code.agentId) : null;
    let password = "";
    try {
      password = decryptPassword(s.passwordEncrypted);
    } catch {
      password = "";
    }
    return {
      id: s.id,
      name: s.name,
      logoUrl: s.logoUrl,
      ownerPhone: s.ownerPhone,
      updatedAt: s.updatedAt,
      code: code?.code || "",
      status: code?.status || "live",
      agentName: agent?.name || null,
      link: code ? qrLink(code.code) : "",
      password,
      isDemo: s.isDemo,
    };
  });
}

export async function ownerImpersonate(shopId: string) {
  const auth = await requireOwner();
  if (!auth) return { ok: false as const };
  const [shop] = await db.select().from(shops).where(eq(shops.id, shopId)).limit(1);
  if (!shop) return { ok: false as const };
  const [code] = await db
    .select()
    .from(codes)
    .where(eq(codes.id, shop.codeId))
    .limit(1);
  if (!code) return { ok: false as const };
  await impersonateShop(shop.id, code.code);
  redirect(`/${code.code}/admin`);
}

export async function ownerSetShopPassword(shopId: string, password: string) {
  const auth = await requireOwner();
  if (!auth) return { ok: false as const };
  if (password.length < 6) return { ok: false as const };
  await db
    .update(shops)
    .set({
      passwordHash: await hashPassword(password),
      passwordEncrypted: encryptPassword(password),
      updatedAt: new Date(),
    })
    .where(eq(shops.id, shopId));
  return { ok: true as const };
}

export async function listLeads(status?: string) {
  const auth = await requireOwner();
  if (!auth) return [];
  let rows = await db.select().from(leads).orderBy(desc(leads.createdAt));
  if (status) rows = rows.filter((r) => r.status === status);
  return rows;
}

export async function updateLeadStatus(
  id: string,
  status: "new" | "contacted" | "converted" | "refused",
) {
  const auth = await requireOwner();
  if (!auth) return { ok: false as const };
  await db.update(leads).set({ status }).where(eq(leads.id, id));
  revalidatePath("/owner");
  return { ok: true as const };
}

export async function convertLead(input: {
  leadId: string;
  codeId: string;
  password: string;
}) {
  const auth = await requireOwner();
  if (!auth) return { ok: false as const };
  if (input.password.length < 6) return { ok: false as const };

  const [lead] = await db
    .select()
    .from(leads)
    .where(eq(leads.id, input.leadId))
    .limit(1);
  const [code] = await db
    .select()
    .from(codes)
    .where(eq(codes.id, input.codeId))
    .limit(1);
  if (!lead || !code || code.status !== "unused") {
    return { ok: false as const, error: "invalid" };
  }

  const shopId = newId();
  const now = new Date();
  await db.insert(shops).values({
    id: shopId,
    codeId: code.id,
    name: lead.shopName,
    slogan: "",
    thanksText: "",
    passwordHash: await hashPassword(input.password),
    passwordEncrypted: encryptPassword(input.password),
    ownerPhone: lead.phone,
    pageLocale: "ar",
    theme: THEME_PRESETS["paper-light"],
    createdAt: now,
    updatedAt: now,
  });

  let order = 0;
  for (const type of BUTTON_TYPES) {
    await db.insert(shopButtons).values({
      id: newId(),
      shopId,
      type,
      enabled: type === "phone",
      fullWidth: type === "review",
      label: "",
      sortOrder: order++,
    });
  }

  await db
    .update(codes)
    .set({ status: "live", shopId, claimedAt: now })
    .where(eq(codes.id, code.id));
  await db
    .update(leads)
    .set({ status: "converted", convertedCodeId: code.id })
    .where(eq(leads.id, lead.id));

  revalidatePath("/owner");
  return { ok: true as const, code: code.code };
}

export async function listAgents() {
  const auth = await requireOwner();
  if (!auth) return [];
  return db.select().from(agents).orderBy(desc(agents.createdAt));
}

export async function addAgent(
  name: string,
  phone?: string,
  password?: string,
) {
  const auth = await requireOwner();
  if (!auth) return { ok: false as const };
  const n = name.trim();
  if (!n) return { ok: false as const };
  const values: typeof agents.$inferInsert = {
    id: newId(),
    name: n,
    phone: phone?.trim() || null,
    createdAt: new Date(),
  };
  if (password && password.length >= 6) {
    values.passwordHash = await hashPassword(password);
    values.passwordEncrypted = encryptPassword(password);
  }
  await db.insert(agents).values(values);
  revalidatePath("/owner");
  revalidatePath("/owner/settings");
  return { ok: true as const };
}

export async function setAgentPassword(agentId: string, password: string) {
  const auth = await requireOwner();
  if (!auth) return { ok: false as const, error: "auth" };
  if (!password || password.length < 6) {
    return { ok: false as const, error: "password" };
  }
  const [row] = await db
    .select()
    .from(agents)
    .where(eq(agents.id, agentId))
    .limit(1);
  if (!row) return { ok: false as const, error: "missing" };

  await db
    .update(agents)
    .set({
      passwordHash: await hashPassword(password),
      passwordEncrypted: encryptPassword(password),
    })
    .where(eq(agents.id, agentId));

  revalidatePath("/owner/settings");
  return { ok: true as const };
}

export async function updateOwnerSettings(patch: {
  homeTitleFr?: string;
  homeTitleAr?: string;
  homeBodyFr?: string;
  homeBodyAr?: string;
  homeCtaFr?: string;
  homeCtaAr?: string;
  password?: string;
}) {
  const auth = await requireOwner();
  if (!auth) return { ok: false as const };
  const [row] = await db
    .select()
    .from(ownerSettings)
    .where(eq(ownerSettings.id, "main"))
    .limit(1);
  if (!row) return { ok: false as const };
  await db
    .update(ownerSettings)
    .set({
      homeTitleFr: patch.homeTitleFr ?? row.homeTitleFr,
      homeTitleAr: patch.homeTitleAr ?? row.homeTitleAr,
      homeBodyFr: patch.homeBodyFr ?? row.homeBodyFr,
      homeBodyAr: patch.homeBodyAr ?? row.homeBodyAr,
      homeCtaFr: patch.homeCtaFr ?? row.homeCtaFr,
      homeCtaAr: patch.homeCtaAr ?? row.homeCtaAr,
      passwordHash: patch.password
        ? await hashPassword(patch.password)
        : row.passwordHash,
    })
    .where(eq(ownerSettings.id, "main"));
  revalidatePath("/");
  return { ok: true as const };
}

// silence unused import warnings in some bundlers
void sql;
void like;
void or;
void and;
void shopTargets;
void desc;
