import { eq, asc } from "drizzle-orm";
import { db } from "./index";
import {
  codes,
  shops,
  shopButtons,
  shopTargets,
  galleryImages,
  type ShopTheme,
} from "./schema";
import { normalizeCode, isValidCodeFormat } from "../codes";

export type ShopFull = {
  code: string;
  status: "unused" | "live" | "disabled";
  shop: typeof shops.$inferSelect | null;
  buttons: Array<
    typeof shopButtons.$inferSelect & {
      targets: (typeof shopTargets.$inferSelect)[];
    }
  >;
  gallery: (typeof galleryImages.$inferSelect)[];
};

export async function getByCode(raw: string): Promise<ShopFull | null> {
  const code = normalizeCode(raw);
  if (!isValidCodeFormat(code) && code !== "DEMO") return null;

  const [row] = await db.select().from(codes).where(eq(codes.code, code)).limit(1);
  if (!row) return null;

  if (!row.shopId || row.status === "unused") {
    return {
      code: row.code,
      status: row.status as ShopFull["status"],
      shop: null,
      buttons: [],
      gallery: [],
    };
  }

  const [shop] = await db
    .select()
    .from(shops)
    .where(eq(shops.id, row.shopId))
    .limit(1);

  const buttons = await db
    .select()
    .from(shopButtons)
    .where(eq(shopButtons.shopId, row.shopId))
    .orderBy(asc(shopButtons.sortOrder));

  const withTargets = await Promise.all(
    buttons.map(async (b) => {
      const targets = await db
        .select()
        .from(shopTargets)
        .where(eq(shopTargets.buttonId, b.id))
        .orderBy(asc(shopTargets.sortOrder));
      return { ...b, targets };
    }),
  );

  const gallery = shop
    ? await db
        .select()
        .from(galleryImages)
        .where(eq(galleryImages.shopId, shop.id))
        .orderBy(asc(galleryImages.sortOrder))
    : [];

  return {
    code: row.code,
    status: row.status as ShopFull["status"],
    shop: shop ?? null,
    buttons: withTargets,
    gallery,
  };
}

export function parseTheme(theme: unknown): ShopTheme {
  if (theme && typeof theme === "object" && "pageFrom" in (theme as object)) {
    return theme as ShopTheme;
  }
  if (typeof theme === "string") {
    try {
      return JSON.parse(theme) as ShopTheme;
    } catch {
      /* fallthrough */
    }
  }
  return {
    preset: "paper-light",
    pageFrom: "#F6F4F0",
    pageTo: "#EDE8DF",
    cardFrom: "#FFFFFF",
    cardTo: "#FAFAF8",
    cardBorder: "#E7E2D9",
    title: "#141414",
    subtitle: "#6B675F",
    text: "#141414",
  };
}
