"use server";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  codes,
  shops,
  shopButtons,
  shopTargets,
  BUTTON_TYPES,
  THEME_PRESETS,
  type ButtonType,
} from "@/lib/db/schema";
import { hashPassword, createShopSession } from "@/lib/auth";
import { encryptPassword } from "@/lib/crypto";
import { normalizeCode } from "@/lib/codes";
import { normalizeDzPhone } from "@/lib/phones";
import { newId } from "@/lib/utils";
import { rateLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

export async function claimShopFull(input: {
  code: string;
  name: string;
  password: string;
  phone: string;
  pageLocale: "ar" | "fr";
  slogan?: string;
  links: Record<string, string>;
}) {
  const h = await headers();
  const ip = h.get("x-forwarded-for") || "local";
  const rl = rateLimit(`claim:${ip}`, 10, 60 * 60 * 1000);
  if (!rl.ok) return { ok: false as const, error: "Too many requests" };

  const code = normalizeCode(input.code);
  const name = input.name.trim();
  if (!name || input.password.length < 6) {
    return { ok: false as const, error: "Invalid" };
  }

  const phone = normalizeDzPhone(input.phone) || input.phone.trim();

  const [row] = await db
    .select()
    .from(codes)
    .where(eq(codes.code, code))
    .limit(1);
  if (!row) return { ok: false as const, error: "Unknown code" };
  if (row.status !== "unused" || row.shopId) {
    return { ok: false as const, error: "Already claimed" };
  }
  if (code === "DEMO") {
    return { ok: false as const, error: "DEMO locked" };
  }

  const shopId = newId();
  const now = new Date();
  const theme = THEME_PRESETS["paper-light"];

  const links = input.links || {};
  const email = (links.email || "").trim();
  const maps = (links.maps || "").trim();
  const review = (links.review || "").trim();

  await db.insert(shops).values({
    id: shopId,
    codeId: row.id,
    name,
    slogan: (input.slogan || "").trim(),
    thanksText: "",
    logoUrl: null,
    passwordHash: await hashPassword(input.password),
    passwordEncrypted: encryptPassword(input.password),
    ownerPhone: phone,
    pageLocale: input.pageLocale || "ar",
    theme,
    email,
    mapsUrl: maps,
    googleReviewUrl: review,
    createdAt: now,
    updatedAt: now,
  });

  let order = 0;
  const buttonIds: Partial<Record<ButtonType, string>> = {};

  for (const type of BUTTON_TYPES) {
    const bid = newId();
    buttonIds[type] = bid;
    await db.insert(shopButtons).values({
      id: bid,
      shopId,
      type,
      enabled: false,
      fullWidth: type === "review",
      sortOrder: order++,
      label: "",
      url: "",
    });
  }

  // Phone from owner
  if (phone) {
    const bid = buttonIds.phone!;
    await db.insert(shopTargets).values({
      id: newId(),
      buttonId: bid,
      label: name,
      value: phone.startsWith("+") ? phone : phone,
      sortOrder: 0,
    });
    await db
      .update(shopButtons)
      .set({ enabled: true, url: phone })
      .where(eq(shopButtons.id, bid));
  }

  const linkMap: Array<[ButtonType, string]> = [
    ["whatsapp", links.whatsapp || ""],
    ["instagram", links.instagram || ""],
    ["facebook", links.facebook || ""],
    ["tiktok", links.tiktok || ""],
    ["maps", links.maps || ""],
    ["telegram", links.telegram || ""],
    ["snapchat", links.snapchat || ""],
    ["youtube", links.youtube || ""],
    ["email", links.email || ""],
    ["review", links.review || ""],
    ["website", links.website || ""],
  ];

  for (const [type, raw] of linkMap) {
    const val = raw.trim();
    if (!val) continue;
    const bid = buttonIds[type]!;
    let value = val;
    if (type === "whatsapp" || type === "telegram") {
      value = normalizeDzPhone(val) || val;
    } else if (type === "email") {
      value = val.startsWith("mailto:") ? val : `mailto:${val}`;
    } else if (!val.startsWith("http")) {
      value = `https://${val}`;
    }
    await db.insert(shopTargets).values({
      id: newId(),
      buttonId: bid,
      label: type,
      value,
      sortOrder: 0,
    });
    await db
      .update(shopButtons)
      .set({ enabled: true, url: value })
      .where(eq(shopButtons.id, bid));
  }

  await db
    .update(codes)
    .set({
      status: "live",
      shopId,
      claimedAt: now,
    })
    .where(eq(codes.id, row.id));

  await createShopSession({ shopId, code });
  revalidatePath(`/${code}`);
  return { ok: true as const, shopId };
}

/** @deprecated kept for compatibility */
export async function claimShop(input: {
  code: string;
  name: string;
  password: string;
  phone: string;
}) {
  return claimShopFull({
    ...input,
    pageLocale: "ar",
    links: {},
  });
}

export async function saveClaimLinks() {
  return { ok: true as const };
}
