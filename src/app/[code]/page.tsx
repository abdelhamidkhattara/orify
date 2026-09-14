import { getByCode, parseTheme } from "@/lib/db/queries";
import { ShopPublicCard } from "@/components/shop/shop-public-card";
import { ClaimWizard } from "@/components/shop/claim-wizard";
import { getLocale } from "@/lib/locale";
import { getMessages } from "@/lib/i18n";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { LangSwitch } from "@/components/lang-switch";
import { Card } from "@/components/ui/card";
import { ensureDb } from "@/lib/db/ensure";

type Props = {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ lang?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await ensureDb();
  const { code } = await params;
  const data = await getByCode(code);
  if (!data?.shop) {
    return { title: "Orify" };
  }
  return {
    title: data.shop.seoTitle || data.shop.name,
    description: data.shop.seoDescription || data.shop.slogan || undefined,
    openGraph: {
      title: data.shop.seoTitle || data.shop.name,
      description: data.shop.seoDescription || data.shop.slogan || undefined,
      images: data.shop.logoUrl ? [data.shop.logoUrl] : undefined,
    },
  };
}

export default async function CodePage({ params, searchParams }: Props) {
  await ensureDb();
  const { code } = await params;
  const sp = await searchParams;
  const data = await getByCode(code);

  // Reserved paths should not hit here in theory
  const reserved = [
    "owner",
    "seller",
    "api",
    "admin",
    "dashboard",
    "login",
    "_next",
    "print",
  ];
  if (reserved.includes(code.toLowerCase())) notFound();

  let locale = await getLocale();
  if (sp.lang === "ar" || sp.lang === "fr") locale = sp.lang;
  const messages = getMessages(locale);

  if (!data) {
    return (
      <SoftMessage
        text={messages.shop.unknown}
        locale={locale}
      />
    );
  }

  if (data.status === "disabled") {
    return (
      <SoftMessage
        text={messages.shop.inactive}
        locale={locale}
      />
    );
  }

  if (data.status === "unused" || !data.shop) {
    return <ClaimWizard code={data.code} locale={locale} />;
  }

  const pageLocale =
    data.shop.pageLocale === "fr" || data.shop.pageLocale === "ar"
      ? data.shop.pageLocale
      : "ar";

  const theme = parseTheme(data.shop.theme);

  return (
    <ShopPublicCard
      code={data.code}
      name={data.shop.name}
      slogan={data.shop.slogan || ""}
      thanksText={data.shop.thanksText || ""}
      logoUrl={data.shop.logoUrl}
      promoEnabled={!!data.shop.promoEnabled}
      promoText={data.shop.promoText || ""}
      addressText={data.shop.addressText || ""}
      hoursText={data.shop.hoursText || ""}
      whatsappPrefill={data.shop.whatsappPrefill || ""}
      telegramPrefill={data.shop.telegramPrefill || ""}
      theme={theme}
      buttons={data.buttons}
      gallery={data.gallery}
      locale={pageLocale}
    />
  );
}

function SoftMessage({
  text,
  locale,
}: {
  text: string;
  locale: "fr" | "ar";
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4">
      <div className="absolute end-4 top-4">
        <LangSwitch locale={locale} />
      </div>
      <Card className="w-full max-w-sm text-center">
        <p className="text-base text-muted">{text}</p>
      </Card>
    </div>
  );
}
