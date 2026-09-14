import { createHash, createCipheriv, createDecipheriv, randomBytes } from "crypto";

function getKey(): Buffer {
  const raw = process.env.OWNER_ENCRYPTION_KEY?.trim() || "";
  if (process.env.NODE_ENV === "production" && !raw) {
    throw new Error("OWNER_ENCRYPTION_KEY is required in production");
  }
  const buf = Buffer.from(raw, "base64");
  if (buf.length === 32) return buf;
  // Derive a stable 32-byte key from whatever was provided (dev fallback)
  return createHash("sha256").update(raw || "dev-owner-key").digest();
}

export function encryptPassword(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decryptPassword(payload: string): string {
  const buf = Buffer.from(payload, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString(
    "utf8",
  );
}
