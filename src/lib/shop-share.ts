import type { ShopFull } from "@/lib/db/queries";
import { parseTheme } from "@/lib/db/queries";
import { effectiveTargets, visibleButtons } from "@/lib/shop-buttons";
import { getAppUrl } from "@/lib/env";
import { qrLink } from "@/lib/utils";

const CHANNEL_FR: Record<string, string> = {
  whatsapp: "WhatsApp",
  phone: "Appel",
  instagram: "Instagram",
  facebook: "Facebook",
  maps: "Maps",
  tiktok: "TikTok",
  snapchat: "Snapchat",
  youtube: "YouTube",
  telegram: "Telegram",
  email: "Email",
  review: "Avis Google",
  website: "Site web",
  catalog: "Catalogue",
  custom: "Lien",
};

const CHANNEL_AR: Record<string, string> = {
  whatsapp: "واتساب",
  phone: "اتصال",
  instagram: "إنستغرام",
  facebook: "فيسبوك",
  maps: "الخريطة",
  tiktok: "تيك توك",
  snapchat: "سناب شات",
  youtube: "يوتيوب",
  telegram: "تيليغرام",
  email: "البريد",
  review: "تقييم قوقل",
  website: "الموقع",
  catalog: "كتالوج",
  custom: "رابط",
};

export type ShopShare = {
  title: string;
  description: string;
  url: string;
  locale: "ar" | "fr";
  ogLocale: string;
  siteName: string;
  channels: string[];
  name: string;
  slogan: string;
  address: string;
  hours: string;
  promo: string | null;
  logoUrl: string | null;
  pageFrom: string;
  pageTo: string;
  cardFrom: string;
  cardTo: string;
  titleColor: string;
  textColor: string;
  kind: "live" | "claim" | "disabled" | "unknown";
};

function absUrl(maybe: string | null | undefined): string | null {
  if (!maybe) return null;
  if (maybe.startsWith("http://") || maybe.startsWith("https://")) return maybe;
  const base = getAppUrl().replace(/\/$/, "");
  return `${base}${maybe.startsWith("/") ? maybe : `/${maybe}`}`;
}

/** Satori/OG can't reliably render SVG as <img> — skip those. */
function ogSafeLogo(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/\.svg(\?|#|$)/i.test(url)) return null;
  if (url.includes("image/svg")) return null;
  return url;
}

function clip(s: string, max: number) {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return t.slice(0, max - 1).trimEnd() + "…";
}

function channelsFrom(data: ShopFull, isAr: boolean): string[] {
  const labels = isAr ? CHANNEL_AR : CHANNEL_FR;
  const vis = visibleButtons(data.buttons);
  const out: string[] = [];
  for (const b of vis) {
    if (effectiveTargets(b).length === 0) continue;
    const label = labels[b.type] || b.type;
    if (!out.includes(label)) out.push(label);
    if (out.length >= 5) break;
  }
  return out;
}

/** Clever title + description + theme for link previews (WhatsApp, etc.). */
export function buildShopShare(
  code: string,
  data: ShopFull | null,
): ShopShare {
  const url = qrLink(code);
  const siteName = "Orify";

  if (!data) {
    return {
      title: "Orify",
      description:
        "Page boutique QR — logo, WhatsApp, Instagram, Maps en un lien.",
      url,
      locale: "fr",
      ogLocale: "fr_DZ",
      siteName,
      channels: [],
      name: "Orify",
      slogan: "Un QR. Toute la boutique.",
      address: "",
      hours: "",
      promo: null,
      logoUrl: absUrl("/og.png"),
      pageFrom: "#F6F4F0",
      pageTo: "#EDE8E0",
      cardFrom: "#FFFFFF",
      cardTo: "#F6F4F0",
      titleColor: "#141414",
      textColor: "#5C5C5C",
      kind: "unknown",
    };
  }

  if (data.status === "disabled") {
    return {
      title: "Orify",
      description: "Cette page boutique n’est pas disponible pour le moment.",
      url,
      locale: "fr",
      ogLocale: "fr_DZ",
      siteName,
      channels: [],
      name: "Orify",
      slogan: "Page indisponible",
      address: "",
      hours: "",
      promo: null,
      logoUrl: absUrl("/og.png"),
      pageFrom: "#1a1a1a",
      pageTo: "#333",
      cardFrom: "#222",
      cardTo: "#111",
      titleColor: "#fff",
      textColor: "#aaa",
      kind: "disabled",
    };
  }

  if (data.status === "unused" || !data.shop) {
    return {
      title: "Activez votre page boutique",
      description:
        "Ce QR est prêt — créez la page de votre magasin en 2 minutes (logo, WhatsApp, Instagram, Maps).",
      url,
      locale: "fr",
      ogLocale: "fr_DZ",
      siteName,
      channels: ["WhatsApp", "Instagram", "Maps"],
      name: "Nouvelle boutique",
      slogan: "Scannez. Activez. En ligne.",
      address: "",
      hours: "",
      promo: null,
      logoUrl: absUrl("/og.png"),
      pageFrom: "#C81E3A",
      pageTo: "#8B1428",
      cardFrom: "#FFFFFF",
      cardTo: "#FFF5F6",
      titleColor: "#141414",
      textColor: "#5C5C5C",
      kind: "claim",
    };
  }

  const shop = data.shop;
  const isAr = shop.pageLocale === "ar";
  const theme = parseTheme(shop.theme);
  const channels = channelsFrom(data, isAr);
  const name = (shop.name || "Boutique").trim();
  const slogan = (shop.slogan || "").trim();
  const thanks = (shop.thanksText || "").trim();
  const address = (shop.addressText || "").trim();
  const hours = (shop.hoursText || "").trim();
  const promo =
    shop.promoEnabled && shop.promoText?.trim()
      ? shop.promoText.trim()
      : null;

  const title = clip(
    (shop.seoTitle || name).trim() || name,
    70,
  );

  let description = (shop.seoDescription || "").trim();
  if (!description) {
    const parts: string[] = [];
    if (slogan) parts.push(slogan);
    else if (thanks) parts.push(thanks);
    else {
      parts.push(
        isAr
          ? "صفحة المتجر — تواصل، خريطة، شبكات اجتماعية"
          : "La page de la boutique — contact, carte, réseaux",
      );
    }
    if (address) parts.push(address);
    if (channels.length) {
      parts.push(channels.join(isAr ? " · " : " · "));
    }
    if (promo) {
      parts.push(
        isAr ? `عرض: ${promo}` : `Offre: ${promo}`,
      );
    }
    description = parts.join(isAr ? " — " : " — ");
  }

  return {
    title,
    description: clip(description, 180),
    url,
    locale: isAr ? "ar" : "fr",
    ogLocale: isAr ? "ar_SA" : "fr_DZ",
    siteName,
    channels,
    name,
    slogan: slogan || thanks || (isAr ? "مرحباً بكم" : "Bienvenue"),
    address,
    hours,
    promo,
    logoUrl: absUrl(ogSafeLogo(shop.logoUrl)),
    pageFrom: theme.pageFrom || "#141414",
    pageTo: theme.pageTo || "#333333",
    cardFrom: theme.cardFrom || "#1f1f1f",
    cardTo: theme.cardTo || "#141414",
    titleColor: theme.title || "#ffffff",
    textColor: theme.subtitle || theme.text || "#dddddd",
    kind: "live",
  };
}

export function shopShareMetadata(share: ShopShare) {
  return {
    title: { absolute: share.title },
    description: share.description,
    alternates: { canonical: share.url },
    openGraph: {
      type: "website" as const,
      url: share.url,
      siteName: share.siteName,
      title: share.title,
      description: share.description,
      locale: share.ogLocale,
      // Image comes from opengraph-image.tsx (1200×630) — much better than raw logo
    },
    twitter: {
      card: "summary_large_image" as const,
      title: share.title,
      description: share.description,
    },
    other: {
      "og:locale": share.ogLocale,
    },
  };
}
