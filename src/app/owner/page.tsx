import { getLocale } from "@/lib/locale";
import { getOwnerStats } from "@/app/actions/owner";
import Link from "next/link";
import { qrLink } from "@/lib/utils";

export default async function OwnerHomePage() {
  const locale = await getLocale();
  const isAr = locale === "ar";
  const stats = await getOwnerStats();

  const cards = [
    {
      label: isAr ? "متاجر مباشرة" : "Boutiques live",
      value: stats.live,
      href: "/owner/shops",
      color: "text-ok",
    },
    {
      label: isAr ? "رموز حرة" : "QR libres",
      value: stats.unused,
      href: "/owner/codes?f=unused",
      color: "text-ink",
    },
    {
      label: isAr ? "طلبات جديدة" : "Demandes nouvelles",
      value: stats.newLeads,
      href: "/owner/leads?f=new",
      color: "text-warn",
    },
    {
      label: isAr ? "معطّلة" : "Désactivés",
      value: stats.disabled,
      href: "/owner/codes?f=disabled",
      color: "text-danger",
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        {isAr ? "الرئيسية" : "Accueil"}
      </h1>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="rounded-[16px] border border-line bg-surface p-4 no-underline shadow-sm"
          >
            <div className={`text-3xl font-bold ${c.color}`}>{c.value}</div>
            <div className="mt-1 text-[13px] text-muted">{c.label}</div>
          </Link>
        ))}
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold">
          {isAr ? "آخر التفعيلات" : "Dernières activations"}
        </h2>
        <div className="space-y-2">
          {stats.recent.length === 0 && (
            <p className="text-muted">—</p>
          )}
          {stats.recent.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between rounded-[12px] border border-line bg-surface px-4 py-3"
            >
              <div>
                <div className="font-medium">{s.name}</div>
                <div className="text-[12px] text-muted">
                  {new Date(s.updatedAt).toLocaleString(
                    isAr ? "ar-DZ" : "fr-DZ",
                  )}
                </div>
              </div>
              <Link
                href="/owner/shops"
                className="text-sm font-medium text-accent"
              >
                →
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">
          {isAr ? "طلبات غير معالجة" : "Demandes non traitées"}
        </h2>
        <div className="space-y-2">
          {stats.openLeads.length === 0 && (
            <p className="text-muted">
              {isAr ? "لا يوجد" : "Aucune"}
            </p>
          )}
          {stats.openLeads.map((l) => (
            <div
              key={l.id}
              className="rounded-[12px] border border-line bg-surface px-4 py-3"
            >
              <div className="font-medium">{l.shopName}</div>
              <div className="text-[13px] text-muted">
                {l.contactName} · <bdi>{l.phone}</bdi>
                {l.city ? ` · ${l.city}` : ""}
              </div>
              <div className="mt-2 flex gap-2">
                <a
                  href={`tel:${l.phone}`}
                  className="rounded-full bg-ink px-3 py-1.5 text-xs text-white"
                >
                  {isAr ? "اتصال" : "Appeler"}
                </a>
                <a
                  href={`https://wa.me/${l.phone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full bg-ok px-3 py-1.5 text-xs text-white"
                >
                  WhatsApp
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      <p className="text-[12px] text-muted">
        DEMO: <bdi className="font-mono">{qrLink("DEMO")}</bdi>
      </p>
    </div>
  );
}
