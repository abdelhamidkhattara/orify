import { ImageResponse } from "next/og";
import { ensureDb } from "@/lib/db/ensure";
import { getByCode } from "@/lib/db/queries";
import { buildShopShare } from "@/lib/shop-share";
import { normalizeCode } from "@/lib/codes";

export const alt = "Aperçu boutique Orify";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function loadFont(): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(
      "https://cdn.jsdelivr.net/fontsource/fonts/tajawal@5.2.5/arabic-700-normal.ttf",
      { next: { revalidate: 86400 * 30 } },
    );
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}

/** Embed logo as data-URL so OG render never breaks on remote fetch. */
async function embedLogo(url: string | null): Promise<string | null> {
  if (!url || /\.svg(\?|#|$)/i.test(url)) return null;
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const ct = (res.headers.get("content-type") || "").split(";")[0];
    if (ct.includes("svg")) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength === 0 || buf.byteLength > 1_500_000) return null;
    const mime = ct.startsWith("image/") ? ct : "image/png";
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

export default async function Image({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  await ensureDb();
  const { code: raw } = await params;
  const code = normalizeCode(raw);
  const data = await getByCode(code);
  const share = buildShopShare(code, data);
  const [font, logoData] = await Promise.all([
    loadFont(),
    embedLogo(share.logoUrl),
  ]);

  const isRtl = share.locale === "ar";
  const chips = share.channels.slice(0, 4);
  const logoSrc = logoData;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: `linear-gradient(135deg, ${share.pageFrom} 0%, ${share.pageTo} 100%)`,
          fontFamily: font ? "Tajawal" : "sans-serif",
          direction: isRtl ? "rtl" : "ltr",
        }}
      >
        {/* soft glow */}
        <div
          style={{
            position: "absolute",
            top: -80,
            right: -60,
            width: 420,
            height: 420,
            borderRadius: 420,
            background: "rgba(255,255,255,0.12)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -100,
            left: -80,
            width: 480,
            height: 480,
            borderRadius: 480,
            background: "rgba(0,0,0,0.12)",
            display: "flex",
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 40,
            width: 1080,
            minHeight: 420,
            padding: 48,
            borderRadius: 36,
            background: `linear-gradient(180deg, ${share.cardFrom} 0%, ${share.cardTo} 100%)`,
            boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
            border: "1px solid rgba(255,255,255,0.12)",
          }}
        >
          {/* Logo panel */}
          <div
            style={{
              display: "flex",
              width: 240,
              height: 240,
              borderRadius: 28,
              background: "rgba(255,255,255,0.92)",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              overflow: "hidden",
              boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
            }}
          >
            {logoSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoSrc}
                width={200}
                height={200}
                alt=""
                style={{
                  objectFit: "contain",
                  width: 200,
                  height: 200,
                }}
              />
            ) : (
              <div
                style={{
                  display: "flex",
                  fontSize: 72,
                  fontWeight: 700,
                  color: "#C81E3A",
                }}
              >
                {share.name.slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>

          {/* Text */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              minWidth: 0,
              gap: 14,
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: 2,
                color: "#C81E3A",
                textTransform: "uppercase",
              }}
            >
              {share.kind === "claim"
                ? isRtl
                  ? "رمز جاهز للتفعيل"
                  : "QR prêt à activer"
                : isRtl
                  ? "صفحة المتجر"
                  : "Page boutique"}
            </div>

            <div
              style={{
                display: "flex",
                fontSize: share.name.length > 28 ? 48 : 58,
                fontWeight: 700,
                lineHeight: 1.15,
                color: share.titleColor,
                maxWidth: 700,
              }}
            >
              {share.name.length > 42
                ? share.name.slice(0, 41) + "…"
                : share.name}
            </div>

            <div
              style={{
                display: "flex",
                fontSize: 28,
                fontWeight: 500,
                lineHeight: 1.35,
                color: share.textColor,
                maxWidth: 700,
              }}
            >
              {share.slogan.length > 90
                ? share.slogan.slice(0, 89) + "…"
                : share.slogan}
            </div>

            {(share.address || share.hours) && (
              <div
                style={{
                  display: "flex",
                  fontSize: 22,
                  color: share.textColor,
                  opacity: 0.85,
                  maxWidth: 700,
                }}
              >
                {[share.address, share.hours].filter(Boolean).join(" · ")}
              </div>
            )}

            {chips.length > 0 && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 10,
                  marginTop: 8,
                }}
              >
                {chips.map((c) => (
                  <div
                    key={c}
                    style={{
                      display: "flex",
                      padding: "10px 18px",
                      borderRadius: 999,
                      background: "rgba(200,30,58,0.12)",
                      color: share.titleColor,
                      fontSize: 20,
                      fontWeight: 700,
                      border: "1px solid rgba(200,30,58,0.25)",
                    }}
                  >
                    {c}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 28,
            alignItems: "center",
            gap: 10,
            color: "rgba(255,255,255,0.92)",
            fontSize: 22,
            fontWeight: 700,
          }}
        >
          <div
            style={{
              display: "flex",
              width: 28,
              height: 28,
              borderRadius: 8,
              background: "#C81E3A",
            }}
          />
          Orify
          <span style={{ opacity: 0.7, fontWeight: 500 }}>
            {isRtl ? "· امسح للفتح" : "· scan to open"}
          </span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: font
        ? [
            {
              name: "Tajawal",
              data: font,
              style: "normal" as const,
              weight: 700 as const,
            },
          ]
        : [],
    },
  );
}
