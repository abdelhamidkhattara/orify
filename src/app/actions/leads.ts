"use server";

import { db } from "@/lib/db";
import { leads, type LeadExtras } from "@/lib/db/schema";
import { newId } from "@/lib/utils";
import { normalizeDzPhone } from "@/lib/phones";
import { rateLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";
import { eq, and, gte } from "drizzle-orm";

export async function submitLead(input: {
  shopName: string;
  contactName: string;
  phone: string;
  city: string;
  message: string;
  locale: string;
  extras?: LeadExtras | Record<string, string>;
}) {
  const h = await headers();
  const ip = h.get("x-forwarded-for") || "local";
  const rl = rateLimit(`lead:${ip}`, 5, 60 * 60 * 1000);
  if (!rl.ok) return { ok: false as const, error: "Too many requests" };

  const shopName = input.shopName.trim();
  const contactName = input.contactName.trim();
  const phone = normalizeDzPhone(input.phone) || input.phone.trim();
  if (!shopName || !contactName || !phone) {
    return { ok: false as const, error: "Missing fields" };
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const existing = await db
    .select()
    .from(leads)
    .where(and(eq(leads.phone, phone), gte(leads.createdAt, since)))
    .limit(1);
  if (existing.length > 0) {
    return { ok: true as const };
  }

  await db.insert(leads).values({
    id: newId(),
    shopName,
    contactName,
    phone,
    city: input.city.trim(),
    message: input.message.trim(),
    extras: (input.extras || {}) as LeadExtras,
    locale: input.locale,
    status: "new",
    createdAt: new Date(),
  });

  return { ok: true as const };
}
