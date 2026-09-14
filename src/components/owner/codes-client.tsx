"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toast } from "@/components/ui/toast";
import {
  generateCodes,
  setCodeStatus,
  assignCodeAgent,
} from "@/app/actions/owner";
import Link from "next/link";

type CodeRow = {
  id: string;
  code: string;
  status: string;
  shopName: string | null;
  agentName: string | null;
  agentId: string | null;
  link: string;
  note: string | null;
};

type Agent = { id: string; name: string };

export function CodesClient({
  locale,
  initial,
  agents,
  filter,
}: {
  locale: "fr" | "ar";
  initial: CodeRow[];
  agents: Agent[];
  filter: string;
}) {
  const isAr = locale === "ar";
  const router = useRouter();
  const [toast, setToast] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [showGen, setShowGen] = useState(false);
  const [count, setCount] = useState(5);
  const [agentId, setAgentId] = useState("");
  const [note, setNote] = useState("");
  const [created, setCreated] = useState<string[] | null>(null);
  const [q, setQ] = useState("");

  const filtered = initial.filter(
    (c) =>
      !q ||
      c.code.toLowerCase().includes(q.toLowerCase()) ||
      (c.shopName || "").toLowerCase().includes(q.toLowerCase()),
  );

  const chips = [
    ["all", isAr ? "الكل" : "Tous"],
    ["unused", isAr ? "حرة" : "Libres"],
    ["live", isAr ? "مباشر" : "Live"],
    ["disabled", isAr ? "متوقف" : "Off"],
  ] as const;

  return (
    <div className="space-y-4">
      <Toast message={toast} onDone={() => setToast(null)} />
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">QR</h1>
        <Button
          type="button"
          className="w-auto px-5"
          onClick={() => setShowGen(true)}
        >
          {isAr ? "توليد" : "Générer"}
        </Button>
      </div>

      <p className="text-[13px] text-muted">
        {isAr
          ? "النطاق المطبوع في الرمز لا يتغير إذا غيّرتم اسم الموقع."
          : "Le domaine imprimé dans le QR ne change pas si vous renommez le site."}
      </p>

      <div className="flex flex-wrap gap-2">
        {chips.map(([id, label]) => (
          <Link
            key={id}
            href={id === "all" ? "/owner/codes" : `/owner/codes?f=${id}`}
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

      <Input
        placeholder={isAr ? "بحث…" : "Rechercher…"}
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      <div className="space-y-2">
        {filtered.map((c) => (
          <div
            key={c.id}
            className="rounded-[16px] border border-line bg-surface p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-mono text-xl font-bold">{c.code}</div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[13px]">
                  <StatusPill status={c.status} isAr={isAr} />
                  <span className="text-muted">
                    {c.shopName || "—"}
                    {c.agentName ? ` · ${c.agentName}` : ""}
                  </span>
                </div>
                <div className="mt-1 break-all font-mono text-[11px] text-muted">
                  <bdi>{c.link}</bdi>
                </div>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/qr/${c.code}`}
                alt=""
                className="h-14 w-14 rounded-lg bg-white p-1"
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href={`/${c.code}`}
                target="_blank"
                className="rounded-full border border-line px-3 py-1.5 text-xs font-medium"
              >
                {isAr ? "فتح" : "Ouvrir"}
              </a>
              <a
                href={`/api/qr/${c.code}`}
                className="rounded-full border border-line px-3 py-1.5 text-xs font-medium"
              >
                SVG
              </a>
              <button
                type="button"
                className="rounded-full border border-line px-3 py-1.5 text-xs font-medium"
                onClick={async () => {
                  await navigator.clipboard.writeText(c.link);
                  setToast(isAr ? "تم النسخ" : "Copié");
                }}
              >
                {isAr ? "نسخ" : "Copier"}
              </button>
              {c.status !== "disabled" ? (
                <button
                  type="button"
                  className="rounded-full border border-danger/30 px-3 py-1.5 text-xs font-medium text-danger"
                  disabled={pending || c.code === "DEMO"}
                  onClick={() =>
                    start(async () => {
                      await setCodeStatus(c.id, "disabled");
                      router.refresh();
                    })
                  }
                >
                  {isAr ? "تعطيل" : "Désactiver"}
                </button>
              ) : (
                <button
                  type="button"
                  className="rounded-full border border-ok/30 px-3 py-1.5 text-xs font-medium text-ok"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      await setCodeStatus(
                        c.id,
                        c.shopName ? "live" : "unused",
                      );
                      router.refresh();
                    })
                  }
                >
                  {isAr ? "تفعيل" : "Réactiver"}
                </button>
              )}
              {agents.length > 0 && (
                <select
                  className="min-h-8 rounded-full border border-line bg-surface px-2 text-xs"
                  value={c.agentId || ""}
                  onChange={(e) =>
                    start(async () => {
                      await assignCodeAgent(c.id, e.target.value || null);
                      router.refresh();
                    })
                  }
                >
                  <option value="">
                    {isAr ? "وكيل…" : "Agent…"}
                  </option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        ))}
      </div>

      {showGen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
          <div className="w-full max-w-md rounded-t-[20px] bg-surface p-5 sm:rounded-[20px]">
            <h3 className="text-lg font-bold">
              {isAr ? "توليد رموز" : "Générer des QR"}
            </h3>
            {!created ? (
              <div className="mt-4 flex flex-col gap-3">
                <Input
                  label={isAr ? "العدد" : "Combien"}
                  type="number"
                  min={1}
                  max={50}
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                />
                <label className="flex flex-col gap-1.5 text-[13px] text-muted">
                  {isAr ? "تعيين لـ" : "Assigner à"}
                  <select
                    className="min-h-[52px] rounded-[12px] border border-line bg-surface px-4 text-base text-ink"
                    value={agentId}
                    onChange={(e) => setAgentId(e.target.value)}
                  >
                    <option value="">—</option>
                    {agents.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </label>
                <Input
                  label={isAr ? "ملاحظة" : "Note"}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
                <Button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      const res = await generateCodes({
                        count,
                        agentId: agentId || null,
                        note,
                      });
                      setCreated(res.codes);
                      router.refresh();
                    })
                  }
                >
                  {isAr ? "توليد" : "Générer"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowGen(false)}
                >
                  {isAr ? "إلغاء" : "Annuler"}
                </Button>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <p className="text-ok">
                  {created.length} {isAr ? "رموز" : "codes"}
                </p>
                <div className="max-h-40 overflow-y-auto font-mono text-sm">
                  {created.join(", ")}
                </div>
                <Link
                  href={`/print?codes=${created.join(",")}`}
                  className="inline-flex min-h-[52px] w-full items-center justify-center rounded-[12px] bg-accent font-medium text-white"
                >
                  {isAr ? "ورقة طباعة" : "Feuille d’impression"}
                </Link>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setCreated(null);
                    setShowGen(false);
                  }}
                >
                  OK
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusPill({ status, isAr }: { status: string; isAr: boolean }) {
  const map: Record<string, string> = {
    unused: isAr ? "حرة" : "Libre",
    live: isAr ? "مباشر" : "Live",
    disabled: isAr ? "متوقف" : "Off",
  };
  const color =
    status === "live"
      ? "bg-ok/15 text-ok"
      : status === "disabled"
        ? "bg-danger/15 text-danger"
        : "bg-bg text-muted";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${color}`}>
      {map[status] || status}
    </span>
  );
}
