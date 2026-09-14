/**
 * Public / non-secret Orify config (safe to commit).
 * Secrets stay in env only — see .env.example
 */

export const OWNER_PATH = "ox-orify-k7m2p9";

/** Production public URLs — change if you add a custom domain */
export const PROD_APP_URL = "https://orify.vercel.app";
export const PROD_QR_BASE_URL = "https://orify.vercel.app";

/** Turso database URL (not secret). Auth token stays in env. */
export const TURSO_DATABASE_URL =
  "libsql://orify-hamidkhattara.aws-eu-west-1.turso.io";

/** Hardcoded passwords (product defaults) */
export const DEMO_PASSWORD = "jarir";
export const OWNER_PASSWORD = "owner123";

/** Local-only defaults when env secrets are missing */
export const DEV_SESSION_SECRET =
  "dev-session-secret-change-me-32chars!!";
