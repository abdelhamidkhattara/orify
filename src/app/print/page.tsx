import { getOwnerSession } from "@/lib/auth";
import { qrSvg } from "@/lib/qr";
import { qrLink } from "@/lib/utils";
import { getLocale } from "@/lib/locale";
import { OWNER_PATH } from "@/lib/config";
import { PrintActions } from "@/components/owner/print-actions";
import { PrintAccessMessage } from "@/components/print/print-access-message";

type Props = { searchParams: Promise<{ codes?: string }> };

export default async function PrintPage({ searchParams }: Props) {
  const session = await getOwnerSession();
  const locale = await getLocale();
  const isAr = locale === "ar";

  if (!session) {
    return (
      <PrintAccessMessage
        locale={locale}
        title={isAr ? "يلزم تسجيل الدخول" : "Connexion requise"}
        body={
          isAr
            ? "دخول المالك مطلوب لطباعة دفعة الرموز."
            : "Connexion propriétaire requise pour imprimer un lot de QR."
        }
        backHref={`/${OWNER_PATH}`}
        backLabel={isAr ? "دخول المالك" : "Accès propriétaire"}
      />
    );
  }

  const sp = await searchParams;
  const list = (sp.codes || "")
    .split(",")
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 24);

  return (
    <div className="bg-white text-ink">
      <PrintActions />
      <div className="mx-auto grid max-w-4xl grid-cols-2 gap-4 p-4 print:gap-3">
        {list.map((code) => (
          <div
            key={code}
            className="break-inside-avoid rounded-xl border border-line p-4 text-center"
          >
            <div
              className="mx-auto flex justify-center"
              dangerouslySetInnerHTML={{
                __html: qrSvg(qrLink(code), 140),
              }}
            />
            <div className="mt-2 font-mono text-xl font-bold">{code}</div>
            <div className="mt-1 text-xs text-muted">Scannez · امسح</div>
          </div>
        ))}
      </div>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
        }
      `}</style>
    </div>
  );
}
