"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toast } from "@/components/ui/toast";
import { updateLeadStatus, convertLead } from "@/app/actions/owner";

type Lead = {
  id: string;
  shopName: string;
  contactName: string;
  phone: string;
  city: string | null;
  message: string | null;
  extras?: Record<string, string> | null;
  status: string;
  createdAt: Date | string;
};

type Code = { id: string; code: string };

export function LeadsClient({
  locale,
  initial,
  unusedCodes,
  filter,
}: {
  locale: "fr" | "ar";
  initial: Lead[];
  unusedCodes: Code[];
  filter: string;
}) {
  const isAr = locale === "ar";
  const router = useRouter();
  const [pending, start] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [convert, setConvert] = useState<Lead | null>(null);
  const [codeId, setCodeId] = useState("");
  const [password, setPassword] = useState("");

  const chips = [
    ["new", isAr ? "جديدة" : "Nouvelles"],
    ["contacted", isAr ? "تم الاتصال" : "Contactées"],
    ["converted", isAr ? "محوّلة" : "Converties"],
    ["refused", isAr ? "مرفوضة" : "Refusées"],
    ["all", isAr ? "الكل" : "Tous"],
  ] as const;

  return (
    <div className="space-y-4">
      <Toast message={toast} onDone={() => setToast(null)} />
      <h1 className="text-2xl font-bold">
        {isAr ? "الطلبات" : "Demandes"}
      </h1>
      <div className="flex flex-wrap gap-2">
        {chips.map(([id, label]) => (
          <Link
            key={id}
            href={id === "all" ? "/owner/leads?f=all" : `/owner/leads?f=${id}`}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              filter === id
                ? "bg-ink text-white"
                : "border border-line bg-surface text-muted"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      <div className="space-y-3">
        {initial.length === 0 && (
          <p className="text-muted">{isAr ? "لا يوجد" : "Aucune"}</p>
        )}
        {initial.map((l) => (
          <div
            key={l.id}
            className="rounded-[16px] border border-line bg-surface p-4"
          >
            <div className="font-semibold">{l.shopName}</div>
            <div className="text-[13px] text-muted">
              {l.contactName}
              {l.city ? ` · ${l.city}` : ""}
            </div>
            <div className="mt-1 font-mono text-sm">
              <bdi>{l.phone}</bdi>
            </div>
            {l.message && (
              <p className="mt-2 text-[14px] text-ink">{l.message}</p>
            )}
            {l.extras &&
              Object.keys(l.extras).length > 0 && (
                <div className="mt-2 space-y-0.5 text-[12px] text-muted">
                  {Object.entries(l.extras).map(([k, v]) =>
                    v ? (
                      <div key={k}>
                        <span className="font-medium text-ink">{k}</span>:{" "}
                        <bdi>{v}</bdi>
                      </div>
                    ) : null,
                  )}
                </div>
              )}
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href={`tel:${l.phone}`}
                className="rounded-full bg-ink px-3 py-1.5 text-xs text-white"
              >
                {isAr ? "اتصال" : "Appeler"}
              </a>
              <a
                href={`https://wa.me/${l.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                  isAr
                    ? "مرحبا، بخصوص طلب رمز QR لمتجركم على Orify"
                    : "Bonjour, concernant votre demande QR Orify",
                )}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-ok px-3 py-1.5 text-xs text-white"
              >
                WhatsApp
              </a>
              {l.status === "new" && (
                <button
                  type="button"
                  className="rounded-full border border-line px-3 py-1.5 text-xs"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      await updateLeadStatus(l.id, "contacted");
                      router.refresh();
                    })
                  }
                >
                  {isAr ? "تم الاتصال" : "Marquer contacté"}
                </button>
              )}
              {(l.status === "new" || l.status === "contacted") && (
                <>
                  <button
                    type="button"
                    className="rounded-full bg-accent px-3 py-1.5 text-xs text-white"
                    onClick={() => {
                      setConvert(l);
                      setCodeId(unusedCodes[0]?.id || "");
                      setPassword("");
                    }}
                  >
                    {isAr ? "تحويل" : "Convertir"}
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-danger/30 px-3 py-1.5 text-xs text-danger"
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        await updateLeadStatus(l.id, "refused");
                        router.refresh();
                      })
                    }
                  >
                    {isAr ? "رفض" : "Refuser"}
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {convert && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
          <div className="w-full max-w-md rounded-t-[20px] bg-surface p-5 sm:rounded-[20px]">
            <h3 className="text-lg font-bold">
              {isAr ? "تحويل" : "Convertir"} — {convert.shopName}
            </h3>
            <p className="mt-1 text-[13px] text-muted">
              {isAr
                ? "اختر رمزاً حراً وحدد كلمة مرور مؤقتة"
                : "Choisissez un QR libre et un mot de passe temporaire"}
            </p>
            <label className="mt-4 flex flex-col gap-1.5 text-[13px] text-muted">
              QR
              <select
                className="min-h-[52px] rounded-[12px] border border-line px-4 text-base text-ink"
                value={codeId}
                onChange={(e) => setCodeId(e.target.value)}
              >
                {unusedCodes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code}
                  </option>
                ))}
              </select>
            </label>
            <Input
              className="mt-3"
              label={isAr ? "كلمة المرور" : "Mot de passe"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <div className="mt-4 flex gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setConvert(null)}
              >
                {isAr ? "إلغاء" : "Annuler"}
              </Button>
              <Button
                type="button"
                disabled={pending || !codeId || password.length < 6}
                onClick={() =>
                  start(async () => {
                    const res = await convertLead({
                      leadId: convert.id,
                      codeId,
                      password,
                    });
                    if (!res.ok) {
                      setToast(isAr ? "خطأ" : "Erreur");
                      return;
                    }
                    setConvert(null);
                    setToast(
                      isAr
                        ? `تم — /${res.code}/admin`
                        : `OK — /${res.code}/admin`,
                    );
                    router.refresh();
                  })
                }
              >
                {isAr ? "تأكيد" : "Confirmer"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
