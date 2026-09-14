"use server";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { shops } from "@/lib/db/schema";
import {
  verifyPassword,
  createShopSession,
  getShopSession,
  getOwnerSession,
  clearShopSession,
  hashPassword,
} from "@/lib/auth";
import { encryptPassword } from "@/lib/crypto";
import { normalizeCode } from "@/lib/codes";
import { rateLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { getByCode, parseTheme } from "@/lib/db/queries";
import {
  shopButtons,
  shopTargets,
  type ShopTheme,
  type PrintSettings,
  BUTTON_TYPES,
} from "@/lib/db/schema";
import { newId } from "@/lib/utils";
import { normalizeDzPhone } from "@/lib/phones";

export async function shopLogin(code: string, password: string) {
  const h = await headers();
  const ip = h.get("x-forwarded-for") || "local";
  const c = normalizeCode(code);
  const rl = rateLimit(`shop-login:${ip}:${c}`, 5, 15 * 60 * 1000);
  if (!rl.ok) return { ok: false as const, error: "rate" };

  const data = await getByCode(c);
  if (!data?.shop) return { ok: false as const, error: "bad" };
  const ok = await verifyPassword(password, data.shop.passwordHash);
  if (!ok) return { ok: false as const, error: "bad" };

  await createShopSession({ shopId: data.shop.id, code: c });
  return { ok: true as const };
}

export async function shopLogout(code: string) {
  await clearShopSession();
  revalidatePath(`/${code}/admin`);
}

export async function requireShop(code: string) {
  const session = await getShopSession();
  const c = normalizeCode(code);
  if (!session || session.code !== c) return null;
  const data = await getByCode(c);
  if (!data?.shop || data.shop.id !== session.shopId) return null;
  return { session, data };
}

export async function requireShopOrOwner(code: string) {
  const c = normalizeCode(code);
  const data = await getByCode(c);
  if (!data?.shop) return null;

  const owner = await getOwnerSession();
  if (owner) return { data, asOwner: true as const };

  const session = await getShopSession();
  if (session && session.code === c && session.shopId === data.shop.id) {
    return { data, asOwner: false as const, session };
  }
  return null;
}

export async function updateShopIdentity(
  code: string,
  patch: {
    name?: string;
    slogan?: string;
    thanksText?: string;
    promoText?: string;
    promoEnabled?: boolean;
    pageLocale?: "ar" | "fr";
    theme?: ShopTheme;
    logoUrl?: string | null;
  },
) {
  const ctx = await requireShop(code);
  if (!ctx) return { ok: false as const };
  const { data } = ctx;
  await db
    .update(shops)
    .set({
      name: patch.name ?? data.shop!.name,
      slogan: patch.slogan ?? data.shop!.slogan,
      thanksText: patch.thanksText ?? data.shop!.thanksText,
      promoText: patch.promoText ?? data.shop!.promoText,
      promoEnabled: patch.promoEnabled ?? data.shop!.promoEnabled,
      pageLocale: patch.pageLocale ?? data.shop!.pageLocale,
      theme: patch.theme ?? parseTheme(data.shop!.theme),
      logoUrl:
        patch.logoUrl !== undefined ? patch.logoUrl : data.shop!.logoUrl,
      updatedAt: new Date(),
    })
    .where(eq(shops.id, data.shop!.id));
  revalidatePath(`/${code}`);
  revalidatePath(`/${code}/admin`);
  return { ok: true as const };
}

export async function updateShopInfos(
  code: string,
  patch: Record<string, string>,
) {
  const ctx = await requireShop(code);
  if (!ctx) return { ok: false as const };
  await db
    .update(shops)
    .set({
      addressText: patch.addressText ?? ctx.data.shop!.addressText,
      hoursText: patch.hoursText ?? ctx.data.shop!.hoursText,
      whatsappPrefill:
        patch.whatsappPrefill ?? ctx.data.shop!.whatsappPrefill,
      telegramPrefill:
        patch.telegramPrefill ?? ctx.data.shop!.telegramPrefill,
      seoTitle: patch.seoTitle ?? ctx.data.shop!.seoTitle,
      seoDescription:
        patch.seoDescription ?? ctx.data.shop!.seoDescription,
      email: patch.email ?? ctx.data.shop!.email,
      updatedAt: new Date(),
    })
    .where(eq(shops.id, ctx.data.shop!.id));

  revalidatePath(`/${code}`);
  return { ok: true as const };
}

export async function updatePrintSettings(
  code: string,
  settings: PrintSettings,
) {
  const ctx = await requireShopOrOwner(code);
  if (!ctx) return { ok: false as const };
  await db
    .update(shops)
    .set({ printSettings: settings, updatedAt: new Date() })
    .where(eq(shops.id, ctx.data.shop!.id));
  revalidatePath(`/print/shop/${code}`);
  return { ok: true as const };
}

export async function toggleButton(
  code: string,
  buttonId: string,
  enabled: boolean,
) {
  const ctx = await requireShop(code);
  if (!ctx) return { ok: false as const };
  const btn = ctx.data.buttons.find((b) => b.id === buttonId);
  if (!btn) return { ok: false as const };

  // Never enable a button with zero targets
  if (enabled) {
    const has =
      btn.targets.length > 0 || Boolean(btn.url && btn.url.trim());
    if (!has) {
      return { ok: false as const, error: "empty" as const };
    }
  }

  await db
    .update(shopButtons)
    .set({ enabled })
    .where(eq(shopButtons.id, buttonId));
  await db
    .update(shops)
    .set({ updatedAt: new Date() })
    .where(eq(shops.id, ctx.data.shop!.id));
  revalidatePath(`/${code}`);
  revalidatePath(`/${code}/admin`);
  return { ok: true as const };
}

export async function reorderButtons(code: string, orderedIds: string[]) {
  const ctx = await requireShop(code);
  if (!ctx) return { ok: false as const };
  for (let i = 0; i < orderedIds.length; i++) {
    await db
      .update(shopButtons)
      .set({ sortOrder: i })
      .where(eq(shopButtons.id, orderedIds[i]));
  }
  revalidatePath(`/${code}`);
  return { ok: true as const };
}

export async function updateButton(
  code: string,
  buttonId: string,
  data: {
    label?: string;
    fullWidth?: boolean;
    targets: Array<{ label: string; value: string }>;
  },
) {
  const ctx = await requireShop(code);
  if (!ctx) return { ok: false as const };
  const btn = ctx.data.buttons.find((b) => b.id === buttonId);
  if (!btn) return { ok: false as const };

  const cleaned = data.targets
    .map((t) => ({
      label: t.label.trim(),
      value: t.value.trim(),
    }))
    .filter((t) => t.value);

  if (cleaned.length === 0) {
    // Disable instead of leaving empty live button
    await db.delete(shopTargets).where(eq(shopTargets.buttonId, buttonId));
    await db
      .update(shopButtons)
      .set({
        enabled: false,
        url: "",
        label: data.label ?? btn.label,
        fullWidth: data.fullWidth ?? btn.fullWidth,
      })
      .where(eq(shopButtons.id, buttonId));
    revalidatePath(`/${code}`);
    revalidatePath(`/${code}/admin`);
    return { ok: true as const, disabled: true as const };
  }

  await db.delete(shopTargets).where(eq(shopTargets.buttonId, buttonId));
  for (let i = 0; i < cleaned.length; i++) {
    let value = cleaned[i].value;
    if (["phone", "whatsapp"].includes(btn.type)) {
      value = normalizeDzPhone(value) || value;
    }
    await db.insert(shopTargets).values({
      id: newId(),
      buttonId,
      label: cleaned[i].label || value,
      value,
      sortOrder: i,
    });
  }

  // Keep url synced to first target for backwards compat
  await db
    .update(shopButtons)
    .set({
      enabled: true,
      url: cleaned[0].value,
      label: data.label ?? btn.label,
      fullWidth: data.fullWidth ?? !!btn.fullWidth,
    })
    .where(eq(shopButtons.id, buttonId));

  await db
    .update(shops)
    .set({ updatedAt: new Date() })
    .where(eq(shops.id, ctx.data.shop!.id));
  revalidatePath(`/${code}`);
  revalidatePath(`/${code}/admin`);
  return { ok: true as const, disabled: false as const };
}

export async function changeShopPassword(
  code: string,
  newPassword: string,
) {
  const ctx = await requireShop(code);
  if (!ctx) return { ok: false as const };
  if (newPassword.length < 6) return { ok: false as const };
  await db
    .update(shops)
    .set({
      passwordHash: await hashPassword(newPassword),
      passwordEncrypted: encryptPassword(newPassword),
      updatedAt: new Date(),
    })
    .where(eq(shops.id, ctx.data.shop!.id));
  return { ok: true as const };
}

export async function ensureButtonCatalog(code: string) {
  const ctx = await requireShop(code);
  if (!ctx) return;
  const existing = new Set(ctx.data.buttons.map((b) => b.type));
  let order = ctx.data.buttons.length;
  for (const type of BUTTON_TYPES) {
    if (existing.has(type)) continue;
    await db.insert(shopButtons).values({
      id: newId(),
      shopId: ctx.data.shop!.id,
      type,
      enabled: false,
      fullWidth: type === "review",
      sortOrder: order++,
    });
  }
}

