import type { ButtonType } from "@/lib/db/schema";
import { waLink, telLink, telegramLink } from "@/lib/phones";
import { PHONE_LIKE } from "@/lib/db/schema";

type Target = { id: string; label: string; value: string };
type Button = {
  id: string;
  type: ButtonType;
  enabled: boolean;
  fullWidth?: boolean | null;
  url: string | null;
  label?: string | null;
  labelFr?: string | null;
  labelAr?: string | null;
  targets: Target[];
};

export function effectiveTargets(b: Button): Target[] {
  if (b.targets?.length) return b.targets;
  if (b.url) {
    return [{ id: "url", label: b.type, value: b.url }];
  }
  return [];
}

export function resolveHref(
  type: ButtonType,
  target: Target | undefined,
  waPrefill: string,
  tgPrefill = "",
): string | null {
  if (!target?.value) return null;
  const v = target.value.trim();
  if (type === "phone") return telLink(v);
  if (type === "whatsapp") return waLink(v, waPrefill);
  if (type === "telegram") {
    void tgPrefill;
    return telegramLink(v);
  }
  if (type === "email") {
    if (v.startsWith("mailto:")) return v;
    return `mailto:${v}`;
  }
  if (v.startsWith("http") || v.startsWith("mailto:")) return v;
  return `https://${v}`;
}

export function buttonLabel(b: Button, defaults: Record<string, string>) {
  if (b.label?.trim()) return b.label.trim();
  if (b.labelAr?.trim()) return b.labelAr.trim();
  if (b.labelFr?.trim()) return b.labelFr.trim();
  return defaults[b.type] || b.type;
}

export function visibleButtons(buttons: Button[]) {
  return buttons.filter((b) => {
    if (!b.enabled) return false;
    return effectiveTargets(b).length > 0;
  });
}

export function isPhoneLike(type: ButtonType) {
  return PHONE_LIKE.includes(type);
}

export const BUTTON_GRADIENTS: Record<ButtonType, string> = {
  maps: "linear-gradient(145deg, #34a853, #2d8e47)",
  facebook: "linear-gradient(145deg, #1877f2, #166fe5)",
  instagram: "linear-gradient(145deg, #e1306c, #c13584)",
  tiktok: "linear-gradient(145deg, #000000, #333333)",
  snapchat: "linear-gradient(145deg, #fffc00, #f7e600)",
  youtube: "linear-gradient(145deg, #ff0000, #cc0000)",
  phone: "linear-gradient(145deg, #25d366, #128c7e)",
  whatsapp: "linear-gradient(145deg, #128c7e, #075e54)",
  telegram: "linear-gradient(145deg, #0088cc, #006699)",
  email: "linear-gradient(145deg, #ff6f00, #e65100)",
  review: "linear-gradient(145deg, #4285f4, #34a853, #fbbc05, #ea4335)",
  website: "linear-gradient(145deg, #141414, #333333)",
  catalog: "linear-gradient(145deg, #5b4b8a, #3d3260)",
  custom: "linear-gradient(145deg, #c81e3a, #9a1530)",
};

export const BUTTON_ICONS: Record<ButtonType, string> = {
  maps: "fa-solid fa-location-dot",
  facebook: "fa-brands fa-facebook-f",
  instagram: "fa-brands fa-instagram",
  tiktok: "fa-brands fa-tiktok",
  snapchat: "fa-brands fa-snapchat",
  youtube: "fa-brands fa-youtube",
  phone: "fa-solid fa-phone",
  whatsapp: "fa-brands fa-whatsapp",
  telegram: "fa-brands fa-telegram-plane",
  email: "fa-solid fa-envelope",
  review: "fa-brands fa-google",
  website: "fa-solid fa-globe",
  catalog: "fa-solid fa-book-open",
  custom: "fa-solid fa-link",
};
