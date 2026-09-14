import {
  DEMO_PASSWORD,
  DEV_OWNER_BOOTSTRAP_PASSWORD,
  DEV_SESSION_SECRET,
  OWNER_PATH,
  PROD_APP_URL,
  PROD_QR_BASE_URL,
} from "@/lib/config";

export function isProd() {
  return process.env.NODE_ENV === "production";
}

/** Public site URL (hardcoded per env). */
export function getAppUrl() {
  if (isProd()) return PROD_APP_URL.replace(/\/$/, "");
  return "http://localhost:3000";
}

/** URL encoded inside QR codes (hardcoded per env). */
export function getQrBaseUrl() {
  if (isProd()) return PROD_QR_BASE_URL.replace(/\/$/, "");
  return "http://localhost:3000";
}

export function getOwnerPath() {
  return OWNER_PATH;
}

export function getDemoPassword() {
  return DEMO_PASSWORD;
}

/** Secret — required in production */
export function getSessionSecret() {
  const s = process.env.SESSION_SECRET?.trim();
  if (s) return s;
  if (isProd()) {
    throw new Error("SESSION_SECRET is required in production");
  }
  return DEV_SESSION_SECRET;
}

/** Secret — required in production */
export function getOwnerBootstrapPassword() {
  const s = process.env.OWNER_BOOTSTRAP_PASSWORD?.trim();
  if (s) return s;
  if (isProd()) {
    throw new Error("OWNER_BOOTSTRAP_PASSWORD is required in production");
  }
  return DEV_OWNER_BOOTSTRAP_PASSWORD;
}

export { OWNER_PATH, DEMO_PASSWORD };
