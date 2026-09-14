import { ensureDb } from "@/lib/db/ensure";
import { canAccessSalesPrint } from "@/app/actions/seller";
import { getAgentSession, getOwnerSession } from "@/lib/auth";
import { qrSvg } from "@/lib/qr";
import { qrLink } from "@/lib/utils";
import { getLocale } from "@/lib/locale";
import { db } from "@/lib/db";
import { codes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { SalesPrintStudio } from "@/components/print/sales-print-studio";
import { PrintAccessMessage } from "@/components/print/print-access-message";

type Props = { searchParams: Promise<{ code?: string }> };

export default async function SalesPrintPage({ searchParams }: Props) {
  await ensureDb();
  const sp = await searchParams;
  const raw = (sp.code || "").trim().toUpperCase();
  const locale = await getLocale();
  const isAr = locale === "ar";

  const agent = await getAgentSession();
  const owner = await getOwnerSession();
  const backHref = agent ? "/seller" : owner ? "/owner/codes" : "/seller";

  if (!raw) {
    return (
      <PrintAccessMessage
        locale={locale}
        title={isAr ? "رمز ناقص" : "Code manquant"}
        body={
          isAr
            ? "افتحوا الطباعة من قائمة الرموز."
            : "Ouvrez l’impression depuis la liste des codes."
        }
        backHref={backHref}
      />
    );
  }

  if (!agent && !owner) {
    return (
      <PrintAccessMessage
        locale={locale}
        title={isAr ? "يلزم تسجيل الدخول" : "Connexion requise"}
        body={
          isAr
            ? "سجّلوا الدخول كبائع أو مالك لطباعة ورقة البيع."
            : "Connectez-vous comme vendeur ou propriétaire pour imprimer."
        }
        backHref="/seller"
        backLabel={isAr ? "دخول البائع" : "Espace vendeur"}
      />
    );
  }

  const [row] = await db
    .select()
    .from(codes)
    .where(eq(codes.code, raw))
    .limit(1);

  if (!row) {
    return (
      <PrintAccessMessage
        locale={locale}
        title={isAr ? "رمز غير معروف" : "Code inconnu"}
        body={
          isAr
            ? `الرمز ${raw} غير موجود.`
            : `Le code ${raw} n’existe pas.`
        }
        backHref={backHref}
      />
    );
  }

  if (row.status !== "unused") {
    return (
      <PrintAccessMessage
        locale={locale}
        title={isAr ? "الرمز مستخدم" : "Code déjà utilisé"}
        body={
          isAr
            ? "ورقة البيع للرموز غير المستخدمة فقط. هذا الرمز أصبح مباشراً — افتحوا صفحة المتجر أو طباعة المتجر."
            : "La feuille vente est pour les codes non utilisés. Celui-ci est déjà live — ouvrez la page boutique."
        }
        backHref={`/${raw}`}
        backLabel={isAr ? "فتح الصفحة" : "Voir la page"}
      />
    );
  }

  const allowed = await canAccessSalesPrint(raw);
  if (!allowed) {
    return (
      <PrintAccessMessage
        locale={locale}
        title={isAr ? "غير مسموح" : "Accès refusé"}
        body={
          isAr
            ? "هذا الرمز غير مخصّص لكم."
            : "Ce code ne vous est pas assigné."
        }
        backHref={backHref}
      />
    );
  }

  const link = qrLink(raw);
  const svg = qrSvg(link, 360);

  return (
    <SalesPrintStudio
      backHref={backHref}
      code={raw}
      qrSvgHtml={svg}
      locale={locale}
    />
  );
}
