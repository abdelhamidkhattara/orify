import { getLocale } from "@/lib/locale";
import { getShopSession } from "@/lib/auth";
import { getByCode } from "@/lib/db/queries";
import { ensureDb } from "@/lib/db/ensure";
import { normalizeCode } from "@/lib/codes";
import { ShopAdminShell } from "@/components/shop-admin/shell";
import { ShopAdminLogin } from "@/components/shop-admin/login";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ code: string }> };

export default async function ShopAdminPage({ params }: Props) {
  await ensureDb();
  const { code: raw } = await params;
  const code = normalizeCode(raw);
  const data = await getByCode(code);
  if (!data || data.status === "unused" || !data.shop) notFound();
  if (data.status === "disabled") notFound();

  const locale = await getLocale();
  const session = await getShopSession();
  const authed =
    session &&
    session.code === code &&
    session.shopId === data.shop.id;

  if (!authed) {
    return (
      <ShopAdminLogin
        code={code}
        shopName={data.shop.name}
        locale={locale}
      />
    );
  }

  return (
    <ShopAdminShell
      code={code}
      locale={locale}
      impersonating={session?.impersonatedBy === "owner"}
      shop={{
        ...data.shop,
        pageLocale:
          data.shop.pageLocale === "fr" || data.shop.pageLocale === "ar"
            ? data.shop.pageLocale
            : "ar",
        telegramPrefill: data.shop.telegramPrefill || "",
      }}
      buttons={data.buttons}
      gallery={data.gallery}
    />
  );
}
