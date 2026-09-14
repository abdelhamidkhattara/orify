"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";
import {
  ownerImpersonate,
  ownerSetShopPassword,
  setCodeStatus,
  listCodes,
} from "@/app/actions/owner";

type ShopRow = {
  id: string;
  name: string;
  logoUrl: string | null;
  ownerPhone: string | null;
  updatedAt: Date | string;
  code: string;
  status: string;
  agentName: string | null;
  link: string;
  password: string;
  isDemo: boolean;
};

export function ShopsClient({
  locale,
  initial,
}: {
  locale: "fr" | "ar";
  initial: ShopRow[];
}) {
  const isAr = locale === "ar";
  const router = useRouter();
  const [q, setQ] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [pwdEdit, setPwdEdit] = useState<{ id: string; value: string } | null>(
    null,
  );

  const filtered = initial.filter((s) => {
    const hay = `${s.name} ${s.code} ${s.ownerPhone || ""} ${s.agentName || ""}`.toLowerCase();
    return !q || hay.includes(q.toLowerCase());
  });

  return (
    <div className="space-y-4">
      <Toast message={toast} onDone={() => setToast(null)} />
      <h1 className="text-2xl font-bold">
        {isAr ? "المتاجر" : "Boutiques"}
      </h1>
      <Input
        placeholder={isAr ? "بحث…" : "Rechercher…"}
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      <div className="space-y-3">
        {filtered.map((s) => (
          <div
            key={s.id}
            className="rounded-[16px] border border-line bg-surface p-4"
          >
            <div className="flex gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-bg text-lg font-bold">
                {s.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={s.logoUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  s.name.slice(0, 1)
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-semibold">{s.name}</span>
                  <span className="rounded-full bg-bg px-2 py-0.5 font-mono text-[11px]">
                    {s.code}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] ${
                      s.status === "live"
                        ? "bg-ok/15 text-ok"
                        : "bg-danger/15 text-danger"
                    }`}
                  >
                    {s.status}
                  </span>
                </div>
                <div className="mt-1 break-all font-mono text-[11px] text-muted">
                  <bdi>{s.link}</bdi>
                </div>
                {s.ownerPhone && (
                  <div className="text-[13px] text-muted">
                    <bdi>{s.ownerPhone}</bdi>
                    {s.agentName ? ` · ${s.agentName}` : ""}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-3 rounded-xl bg-bg px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] text-muted">
                  {isAr ? "كلمة المرور" : "Mot de passe"}
                </span>
                <button
                  type="button"
                  className="text-[12px] font-medium text-accent"
                  onClick={() =>
                    setRevealed((r) => ({ ...r, [s.id]: !r[s.id] }))
                  }
                >
                  {revealed[s.id]
                    ? isAr
                      ? "إخفاء"
                      : "Masquer"
                    : isAr
                      ? "إظهار"
                      : "Afficher"}
                </button>
              </div>
              <div className="mt-1 flex items-center gap-2 font-mono text-sm">
                <span className="flex-1">
                  {revealed[s.id] ? s.password : "••••••••"}
                </span>
                {revealed[s.id] && (
                  <button
                    type="button"
                    className="text-xs text-accent"
                    onClick={async () => {
                      await navigator.clipboard.writeText(s.password);
                      setToast(isAr ? "تم النسخ" : "Copié");
                    }}
                  >
                    {isAr ? "نسخ" : "Copier"}
                  </button>
                )}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href={`/${s.code}`}
                target="_blank"
                className="rounded-full border border-line px-3 py-2 text-xs font-medium"
              >
                {isAr ? "عرض" : "Voir"}
              </a>
              <button
                type="button"
                disabled={pending}
                className="rounded-full bg-accent px-3 py-2 text-xs font-medium text-white"
                onClick={() =>
                  start(async () => {
                    await ownerImpersonate(s.id);
                  })
                }
              >
                {isAr ? "إدارة" : "Gérer"}
              </button>
              <button
                type="button"
                className="rounded-full border border-line px-3 py-2 text-xs font-medium"
                onClick={() => setPwdEdit({ id: s.id, value: "" })}
              >
                {isAr ? "كلمة المرور" : "Mot de passe"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {pwdEdit && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
          <div className="w-full max-w-sm rounded-t-[20px] bg-surface p-5 sm:rounded-[20px]">
            <h3 className="font-bold">
              {isAr ? "كلمة مرور جديدة" : "Nouveau mot de passe"}
            </h3>
            <Input
              className="mt-3"
              type="text"
              value={pwdEdit.value}
              onChange={(e) =>
                setPwdEdit({ ...pwdEdit, value: e.target.value })
              }
            />
            <div className="mt-3 flex gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setPwdEdit(null)}
              >
                {isAr ? "إلغاء" : "Annuler"}
              </Button>
              <Button
                type="button"
                disabled={pending || pwdEdit.value.length < 6}
                onClick={() =>
                  start(async () => {
                    await ownerSetShopPassword(pwdEdit.id, pwdEdit.value);
                    setPwdEdit(null);
                    setToast(isAr ? "تم الحفظ" : "Enregistré");
                    router.refresh();
                  })
                }
              >
                {isAr ? "حفظ" : "Enregistrer"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

void listCodes;
void setCodeStatus;
