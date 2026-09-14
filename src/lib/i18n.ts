import { createTranslator } from "next-intl";
import fr from "../../messages/fr.json";
import ar from "../../messages/ar.json";
import type { Locale } from "./locale";

const catalogs = { fr, ar } as const;

export function getMessages(locale: Locale) {
  return catalogs[locale];
}

export function tFactory(locale: Locale) {
  return createTranslator({ locale, messages: getMessages(locale) });
}

export type Messages = typeof fr;
