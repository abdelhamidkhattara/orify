"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";
import { createMyCode } from "@/app/actions/seller";

type UnusedCode = {
  id: string;
  code: string;
  link: string;
  createdAt: Date;
};

type LiveShop = {
  id: string;
  code: string;
  link: string;
  shopName: string;
  claimedAt: Date | null;
};

export function SellerDashboard({
  locale,
  unused,
  live,
}: {
  locale: "fr" | "ar";
  unused: UnusedCode[];
  live: LiveShop[];
}) {
  const isAr = locale === "ar";
  const router = useRouter();
  const [pending, start] = useTransition();
  const [toast, setToast] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <Toast message={toast} onDone={() => setToast(null)} />

      <Button
        type="button"
        size="lg"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await createMyCode();
            if (!res.ok) {
              setToast(isAr ? "خطأ" : "Erreur");
              return;
            }
            setToast(isAr ? `تم: ${res.code}` : `Créé: ${res.code}`);
            router.refresh();
          })
        }
      >
        {pending
          ? "…"
          : isAr
            ? "رمز جديد"
            : "Nouveau QR"}
      </Button>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">
          {isAr ? "رموز غير مستخدمة" : "Codes non utilisés"}
          <span className="ms-2 text-sm font-normal text-muted">
            ({unused.length})
          </span>
        </h2>
        {unused.length === 0 && (
          <p className="text-muted">
            {isAr ? "لا يوجد — أنشئ رمزاً جديداً" : "Aucun — créez un QR"}
          </p>
        )}
        <div className="space-y-2">
          {unused.map((c) => (
            <Card key={c.id} className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-mono text-xl font-bold">{c.code}</div>
                  <div className="text-[12px] text-muted">
                    {new Date(c.createdAt).toLocaleDateString(
                      isAr ? "ar-DZ" : "fr-DZ",
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="w-auto min-w-[100px]"
                    onClick={() => {
                      void navigator.clipboard.writeText(c.link);
                      setToast(isAr ? "تم النسخ" : "Copié");
                    }}
                  >
                    {isAr ? "نسخ الرابط" : "Copier"}
                  </Button>
                  <Link
                    href={c.link}
                    target="_blank"
                    className="inline-flex min-h-10 items-center justify-center rounded-[12px] border border-line bg-surface px-3 text-sm font-medium no-underline"
                  >
                    {isAr ? "فتح" : "Ouvrir"}
                  </Link>
                  <Link
                    href={`/print/sales?code=${c.code}`}
                    target="_blank"
                    className="inline-flex min-h-10 items-center justify-center rounded-[12px] bg-ink px-3 text-sm font-medium text-white no-underline"
                  >
                    {isAr ? "طباعة A4" : "Imprimer A4"}
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">
          {isAr ? "متاجر مباشرة" : "Boutiques live"}
          <span className="ms-2 text-sm font-normal text-muted">
            ({live.length})
          </span>
        </h2>
        {live.length === 0 && (
          <p className="text-muted">{isAr ? "لا يوجد بعد" : "Aucune pour l’instant"}</p>
        )}
        <div className="space-y-2">
          {live.map((s) => (
            <Card key={s.id} className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-medium">{s.shopName}</div>
                  <div className="font-mono text-[13px] text-muted">{s.code}</div>
                  {s.claimedAt && (
                    <div className="text-[12px] text-muted">
                      {new Date(s.claimedAt).toLocaleDateString(
                        isAr ? "ar-DZ" : "fr-DZ",
                      )}
                    </div>
                  )}
                </div>
                <Link
                  href={s.link}
                  target="_blank"
                  className="inline-flex min-h-10 items-center justify-center rounded-[12px] border border-line bg-surface px-3 text-sm font-medium no-underline"
                >
                  {isAr ? "فتح" : "Ouvrir"}
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
