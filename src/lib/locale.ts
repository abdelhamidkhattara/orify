import { cookies, headers } from "next/headers";

export type Locale = "fr" | "ar";

export async function getLocale(): Promise<Locale> {
  const jar = await cookies();
  const fromCookie = jar.get("NEXT_LOCALE")?.value;
  if (fromCookie === "fr" || fromCookie === "ar") return fromCookie;

  const h = await headers();
  const accept = h.get("accept-language") || "";
  if (accept.toLowerCase().includes("ar")) return "ar";
  return "fr";
}

export function dirFor(locale: Locale) {
  return locale === "ar" ? "rtl" : "ltr";
}
