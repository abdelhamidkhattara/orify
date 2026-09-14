import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { getAppUrl, getQrBaseUrl } from "@/lib/env";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function newId() {
  return crypto.randomUUID();
}

export function qrLink(code: string) {
  return `${getQrBaseUrl()}/${code}`;
}

export function appLink(path = "") {
  const base = getAppUrl();
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
