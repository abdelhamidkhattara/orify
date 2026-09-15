import { NextRequest, NextResponse } from "next/server";
import { getShopSession, getOwnerSession } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { newId } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const shop = await getShopSession();
  const owner = await getOwnerSession();
  if (!shop && !owner) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Images only" }, { status: 400 });
  }
  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: "Max 2MB" }, { status: 400 });
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (token) {
    const { put } = await import("@vercel/blob");
    const safeName = file.name.replace(/[^\w.\-]+/g, "_").slice(0, 80);
    const blob = await put(`shops/${newId()}-${safeName}`, file, {
      access: "public",
      token,
      addRandomSuffix: true,
    });
    return NextResponse.json({ url: blob.url });
  }

  // Production (Vercel) cannot write to the filesystem — Blob is required.
  if (process.env.VERCEL || process.env.NODE_ENV === "production") {
    return NextResponse.json(
      {
        error:
          "BLOB_READ_WRITE_TOKEN missing. Create a Vercel Blob store and link it to this project.",
      },
      { status: 503 },
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const ext = file.type.includes("png")
    ? "png"
    : file.type.includes("webp")
      ? "webp"
      : "jpg";
  const name = `${newId()}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), buf);
  return NextResponse.json({ url: `/uploads/${name}` });
}
