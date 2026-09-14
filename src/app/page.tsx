import { getLocale } from "@/lib/locale";
import { db } from "@/lib/db";
import { ownerSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { HomePage } from "@/components/home/home-page";
import { ensureDb } from "@/lib/db/ensure";

export default async function Page() {
  await ensureDb();
  const locale = await getLocale();

  let title =
    locale === "ar" ? "رمز واحد. كل المتجر." : "Un QR. Toute la boutique.";
  let body =
    locale === "ar"
      ? "الشعار، واتساب، إنستغرام، الخريطة، تقييمات قوقل — صفحة واحدة على الطاولة."
      : "Logo, WhatsApp, Instagram, Maps, avis Google — une seule page, sur le comptoir.";
  let cta = locale === "ar" ? "اتصلوا بي" : "Contactez-moi";

  try {
    const [row] = await db
      .select()
      .from(ownerSettings)
      .where(eq(ownerSettings.id, "main"))
      .limit(1);
    if (row) {
      title = locale === "ar" ? row.homeTitleAr : row.homeTitleFr;
      body = locale === "ar" ? row.homeBodyAr : row.homeBodyFr;
      cta = locale === "ar" ? row.homeCtaAr : row.homeCtaFr;
    }
  } catch {
    /* db not ready yet */
  }

  return (
    <HomePage locale={locale} title={title} body={body} cta={cta} />
  );
}
