/** Compress / resize a phone photo so uploads stay under Vercel limits. */
export async function prepareImageForUpload(
  file: File,
  maxBytes = 1.8 * 1024 * 1024,
  maxEdge = 1600,
): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  if (file.size <= maxBytes && !file.type.includes("heic")) {
    // Still shrink huge dimensions from modern phones
    try {
      const bmp = await createImageBitmap(file);
      if (bmp.width <= maxEdge && bmp.height <= maxEdge && file.size <= maxBytes) {
        bmp.close();
        return file;
      }
      bmp.close();
    } catch {
      return file;
    }
  }

  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, maxEdge / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * scale));
    const h = Math.max(1, Math.round(bmp.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bmp.close();
      return file;
    }
    ctx.drawImage(bmp, 0, 0, w, h);
    bmp.close();

    let quality = 0.85;
    let blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );
    while (blob && blob.size > maxBytes && quality > 0.45) {
      quality -= 0.1;
      blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", quality),
      );
    }
    if (!blob) return file;
    const name = file.name.replace(/\.\w+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg" });
  } catch {
    return file;
  }
}
