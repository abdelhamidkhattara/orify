import { NextRequest, NextResponse } from "next/server";
import { qrSvg } from "@/lib/qr";
import { qrLink } from "@/lib/utils";
import { normalizeCode, isValidCodeFormat } from "@/lib/codes";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ code: string }> },
) {
  const { code: raw } = await ctx.params;
  const code = normalizeCode(raw);
  if (!isValidCodeFormat(code) && code !== "DEMO") {
    return new NextResponse("Not found", { status: 404 });
  }
  const svg = qrSvg(qrLink(code), 512);
  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Content-Disposition": `attachment; filename="orify-${code}.svg"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
