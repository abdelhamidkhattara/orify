/** Shop logos: small on disk, fast on the public page. */

export const LOGO_MAX_EDGE = 512;
/** Soft target after compress */
export const LOGO_TARGET_BYTES = 90 * 1024;
/** Hard cap sent to the API */
export const LOGO_HARD_MAX_BYTES = 320 * 1024;
/** Reject absurd camera dumps before work */
export const LOGO_INPUT_MAX_BYTES = 12 * 1024 * 1024;

export type PrepareLogoResult =
  | { ok: true; file: File }
  | {
      ok: false;
      code: "empty" | "type" | "too_large" | "decode";
    };

function toBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

async function encodeLogo(
  canvas: HTMLCanvasElement,
): Promise<{ blob: Blob; ext: string; type: string } | null> {
  // Prefer WebP (much smaller); fall back to JPEG.
  for (const quality of [0.72, 0.62, 0.52, 0.42]) {
    const webp = await toBlob(canvas, "image/webp", quality);
    if (webp && webp.size > 0 && webp.size <= LOGO_HARD_MAX_BYTES) {
      if (webp.size <= LOGO_TARGET_BYTES || quality <= 0.52) {
        return { blob: webp, ext: "webp", type: "image/webp" };
      }
    }
  }

  for (const quality of [0.78, 0.68, 0.58, 0.48]) {
    const jpg = await toBlob(canvas, "image/jpeg", quality);
    if (jpg && jpg.size > 0 && jpg.size <= LOGO_HARD_MAX_BYTES) {
      return { blob: jpg, ext: "jpg", type: "image/jpeg" };
    }
  }

  const last = await toBlob(canvas, "image/jpeg", 0.4);
  if (last && last.size > 0) {
    return { blob: last, ext: "jpg", type: "image/jpeg" };
  }
  return null;
}

/**
 * Always recompress raster logos to ~512px WebP/JPEG.
 * Tiny SVGs pass through (vector, already small).
 */
export async function prepareLogoForUpload(
  file: File,
): Promise<PrepareLogoResult> {
  if (!file || file.size <= 0) return { ok: false, code: "empty" };

  const mime = (file.type || "").toLowerCase();
  const nameLower = file.name.toLowerCase();
  const isSvg =
    mime === "image/svg+xml" || nameLower.endsWith(".svg");
  const isImage =
    mime.startsWith("image/") ||
    /\.(jpe?g|png|webp|gif|bmp|avif)$/i.test(file.name);

  if (!isImage && !isSvg) return { ok: false, code: "type" };
  if (file.size > LOGO_INPUT_MAX_BYTES) return { ok: false, code: "too_large" };

  // Keep small SVGs as-is (often a few KB).
  if (isSvg) {
    if (file.size > 80 * 1024) return { ok: false, code: "too_large" };
    return {
      ok: true,
      file: new File([file], file.name.replace(/[^\w.\-]+/g, "_"), {
        type: "image/svg+xml",
      }),
    };
  }

  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(
      1,
      LOGO_MAX_EDGE / Math.max(bmp.width, bmp.height, 1),
    );
    const w = Math.max(1, Math.round(bmp.width * scale));
    const h = Math.max(1, Math.round(bmp.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bmp.close();
      return { ok: false, code: "decode" };
    }
    // White backdrop so transparent PNGs don't become black in JPEG fallback
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bmp, 0, 0, w, h);
    bmp.close();

    const encoded = await encodeLogo(canvas);
    if (!encoded) return { ok: false, code: "decode" };
    if (encoded.blob.size > LOGO_HARD_MAX_BYTES) {
      return { ok: false, code: "too_large" };
    }

    const base = file.name.replace(/\.[^.]+$/, "").replace(/[^\w.\-]+/g, "_");
    const outName = `${base || "logo"}.${encoded.ext}`;
    return {
      ok: true,
      file: new File([encoded.blob], outName, { type: encoded.type }),
    };
  } catch {
    return { ok: false, code: "decode" };
  }
}

/** @deprecated use prepareLogoForUpload */
export async function prepareImageForUpload(file: File): Promise<File> {
  const r = await prepareLogoForUpload(file);
  if (r.ok) return r.file;
  throw new Error(r.code);
}
