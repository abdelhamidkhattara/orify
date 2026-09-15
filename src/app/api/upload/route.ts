import { NextRequest, NextResponse } from "next/server";
import { getShopSession, getOwnerSession } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { newId } from "@/lib/utils";
import { normalizeCode } from "@/lib/codes";

const HARD_MAX = 400 * 1024; // after optimize
const RAW_MAX = 12 * 1024 * 1024;
const LOGO_EDGE = 512;

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

function isOurBlobUrl(url: string) {
  try {
    const u = new URL(url);
    return (
      u.hostname.endsWith(".blob.vercel-storage.com") ||
      u.hostname.endsWith(".public.blob.vercel-storage.com")
    );
  } catch {
    return false;
  }
}

async function tryDeleteBlob(url: string, token: string) {
  if (!isOurBlobUrl(url)) return;
  try {
    const { del } = await import("@vercel/blob");
    await del(url, { token });
  } catch {
    /* non-blocking — old file may already be gone */
  }
}

async function optimizeLogo(
  input: Buffer,
  contentType: string,
): Promise<{ buffer: Buffer; contentType: string; ext: string }> {
  // Pass tiny SVGs through
  if (contentType.includes("svg")) {
    if (input.length > 80 * 1024) {
      throw new Error("SVG too large");
    }
    return { buffer: input, contentType: "image/svg+xml", ext: "svg" };
  }

  try {
    const sharp = (await import("sharp")).default;
    let pipeline = sharp(input, { failOn: "none" }).rotate();
    pipeline = pipeline.resize(LOGO_EDGE, LOGO_EDGE, {
      fit: "inside",
      withoutEnlargement: true,
    });

    // WebP first
    let out = await pipeline.webp({ quality: 72, effort: 4 }).toBuffer();
    if (out.length > HARD_MAX) {
      out = await sharp(input, { failOn: "none" })
        .rotate()
        .resize(LOGO_EDGE, LOGO_EDGE, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 55, effort: 4 })
        .toBuffer();
    }
    if (out.length > HARD_MAX) {
      out = await sharp(input, { failOn: "none" })
        .rotate()
        .resize(400, 400, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 60, mozjpeg: true })
        .toBuffer();
      return { buffer: out, contentType: "image/jpeg", ext: "jpg" };
    }
    return { buffer: out, contentType: "image/webp", ext: "webp" };
  } catch {
    // Sharp missing / decode fail — keep client-compressed bytes if small enough
    if (input.length <= HARD_MAX && contentType.startsWith("image/")) {
      const ext = contentType.includes("webp")
        ? "webp"
        : contentType.includes("png")
          ? "png"
          : contentType.includes("svg")
            ? "svg"
            : "jpg";
      return { buffer: input, contentType, ext };
    }
    throw new Error("Could not process image");
  }
}

export async function POST(req: NextRequest) {
  try {
    const shop = await getShopSession();
    const owner = await getOwnerSession();
    if (!shop && !owner) {
      return jsonError("Unauthorized", 401);
    }

    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return jsonError("Invalid upload", 400);
    }

    const file = form.get("file");
    if (!(file instanceof File)) {
      return jsonError("No file", 400);
    }
    if (file.size <= 0) {
      return jsonError("Empty file", 400);
    }
    if (file.size > RAW_MAX) {
      return jsonError("File too large", 400);
    }

    const type = (file.type || "application/octet-stream").toLowerCase();
    const okType =
      type.startsWith("image/") ||
      file.name.toLowerCase().endsWith(".svg");
    if (!okType) {
      return jsonError("Images only", 400);
    }

    const codeRaw = String(form.get("code") || "").trim();
    const code = codeRaw ? normalizeCode(codeRaw) : "shop";
    if (shop && codeRaw && shop.code !== code) {
      return jsonError("Unauthorized", 401);
    }

    const replaceUrl = String(form.get("replaceUrl") || "").trim();

    let raw: Buffer;
    try {
      raw = Buffer.from(await file.arrayBuffer());
    } catch {
      return jsonError("Could not read file", 400);
    }

    let optimized: { buffer: Buffer; contentType: string; ext: string };
    try {
      optimized = await optimizeLogo(raw, type || "image/jpeg");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not process image";
      return jsonError(msg, 400);
    }

    if (optimized.buffer.length > HARD_MAX) {
      return jsonError("Image still too large after compress", 400);
    }

    const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
    const pathname = `shops/${code}/logo-${newId()}.${optimized.ext}`;

    if (token) {
      try {
        const { put } = await import("@vercel/blob");
        const blob = await put(pathname, optimized.buffer, {
          access: "public",
          token,
          contentType: optimized.contentType,
          addRandomSuffix: false,
          cacheControlMaxAge: 60 * 60 * 24 * 365,
        });
        if (replaceUrl) {
          // Free old logo storage (best-effort)
          void tryDeleteBlob(replaceUrl, token);
        }
        return NextResponse.json({
          url: blob.url,
          bytes: optimized.buffer.length,
          contentType: optimized.contentType,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Blob upload failed";
        return jsonError(msg, 502);
      }
    }

    if (process.env.VERCEL || process.env.NODE_ENV === "production") {
      return jsonError(
        "BLOB_READ_WRITE_TOKEN missing. Create a Vercel Blob store and Redeploy.",
        503,
      );
    }

    const name = `${newId()}.${optimized.ext}`;
    const dir = path.join(process.cwd(), "public", "uploads");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, name), optimized.buffer);
    return NextResponse.json({
      url: `/uploads/${name}`,
      bytes: optimized.buffer.length,
      contentType: optimized.contentType,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Upload failed";
    return jsonError(msg, 500);
  }
}
