import { ensureDb } from "@/lib/db/ensure";
import { requireShopOrOwner } from "@/app/actions/shop-admin";
import { DEFAULT_PRINT } from "@/lib/db/schema";
import { qrSvg } from "@/lib/qr";
import { qrLink } from "@/lib/utils";
import { getLocale } from "@/lib/locale";
import { ShopPrintDesigner } from "@/components/print/shop-print-designer";
import { PrintAccessMessage } from "@/components/print/print-access-message";

type Props = { params: Promise<{ code: string }> };

export default async function ShopPrintPage({ params }: Props) {
  await ensureDb();
  const { code } = await params;
  const locale = await getLocale();
  const isAr = locale === "ar";
  const ctx = await requireShopOrOwner(code);

  if (!ctx?.data.shop) {
    return (
      <PrintAccessMessage
        locale={locale}
        title={isAr ? "يلزم تسجيل الدخول" : "Connexion requise"}
        body={
          isAr
            ? "ادخلوا إلى إدارة المتجر أولاً لتصميم ورقة QR."
            : "Connectez-vous à l’admin boutique pour concevoir la feuille QR."
        }
        backHref={`/${code.toUpperCase()}/admin`}
        backLabel={isAr ? "إدارة المتجر" : "Admin boutique"}
      />
    );
  }

  const shop = ctx.data.shop;
  const settings = { ...DEFAULT_PRINT, ...(shop.printSettings ?? {}) };
  const svg = qrSvg(qrLink(ctx.data.code), 256);

  return (
    <ShopPrintDesigner
      code={ctx.data.code}
      shopName={shop.name}
      slogan={shop.slogan || ""}
      logoUrl={shop.logoUrl}
      qrSvgHtml={svg}
      initial={settings}
      locale={locale}
    />
  );
}
