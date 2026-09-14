"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Toast } from "@/components/ui/toast";
import { A4PreviewFrame } from "@/components/print/a4-preview-frame";
import {
  A4_PRINT_CSS,
  downloadQrPng,
  downloadWordA4,
  svgToPngDataUrl,
} from "@/lib/print-export";

type SalesPrintSettings = {
  qrSize: number;
  showTitle: boolean;
  showShopName: boolean;
  showCode: boolean;
  showHint: boolean;
  showCustomText: boolean;
  titleFr: string;
  titleAr: string;
  shopName: string;
  customText: string;
  hintText: string;
};

const DEFAULTS: SalesPrintSettings = {
  qrSize: 90,
  showTitle: true,
  showShopName: false,
  showCode: true,
  showHint: true,
  showCustomText: false,
  titleFr: "Votre page boutique",
  titleAr: "صفحتكم جاهزة بعد المسح",
  shopName: "",
  customText: "",
  hintText: "Scannez pour votre page · امسح لصفحتكم",
};

const STORAGE_KEY = "orify-seller-print-v1";

function loadSettings(): SalesPrintSettings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

function Chip({
  on,
  label,
  onClick,
}: {
  on: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-11 rounded-full border px-3.5 text-sm font-medium transition active:opacity-90 ${
        on ? "border-ink bg-ink text-white" : "border-line bg-surface text-ink"
      }`}
    >
      {label}
    </button>
  );
}

function SizeControl({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-ink">{label}</span>
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            inputMode="numeric"
            min={min}
            max={max}
            value={value}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === "") return;
              const n = Number(raw);
              if (!Number.isFinite(n)) return;
              onChange(Math.min(max, Math.max(min, Math.round(n))));
            }}
            onBlur={(e) => {
              const n = Number(e.target.value);
              if (!Number.isFinite(n)) onChange(min);
              else onChange(Math.min(max, Math.max(min, Math.round(n))));
            }}
            className="h-11 w-[4.5rem] rounded-[12px] border border-line bg-surface px-2 text-center font-mono text-base text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
            aria-label={label}
          />
          <span className="text-sm text-muted">mm</span>
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={Math.min(max, Math.max(min, value))}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-line accent-accent"
      />
    </div>
  );
}

function SalesSheet({
  code,
  qrSvgHtml,
  settings,
  mode,
}: {
  code: string;
  qrSvgHtml: string;
  settings: SalesPrintSettings;
  mode: "screen" | "print";
}) {
  const qrMm = Math.min(140, Math.max(40, settings.qrSize));

  return (
    <div
      className={
        mode === "print" ? "a4-sheet a4-sheet-print" : "a4-sheet a4-sheet-screen"
      }
    >
      <div className="a4-inner" style={{ gap: "5mm" }}>
        {settings.showTitle ? (
          <>
            <p className="sales-lead">QR · صفحة المتجر</p>
            <hr className="a4-rule" />
            {settings.titleFr.trim() ? (
              <p className="sales-title">{settings.titleFr.trim()}</p>
            ) : null}
            {settings.titleAr.trim() ? (
              <p className="a4-slogan">{settings.titleAr.trim()}</p>
            ) : null}
          </>
        ) : null}

        {settings.showShopName && settings.shopName.trim() ? (
          <p className="sales-shop">{settings.shopName.trim()}</p>
        ) : null}

        {settings.showCustomText && settings.customText.trim() ? (
          <p className="a4-custom">{settings.customText.trim()}</p>
        ) : null}

        <div
          className="a4-qr-wrap"
          style={{ width: `${qrMm + 8}mm`, height: `${qrMm + 8}mm` }}
          dangerouslySetInnerHTML={{
            __html: qrSvgHtml.replace(
              "<svg",
              `<svg width="${qrMm}mm" height="${qrMm}mm" style="width:${qrMm}mm;height:${qrMm}mm;display:block"`,
            ),
          }}
        />

        {settings.showCode ? <div className="a4-code">{code}</div> : null}

        {settings.showHint && settings.hintText.trim() ? (
          <p className="a4-hint">{settings.hintText.trim()}</p>
        ) : null}
      </div>
    </div>
  );
}

export function SalesPrintStudio({
  backHref,
  code,
  qrSvgHtml,
  locale = "fr",
}: {
  backHref: string;
  code: string;
  qrSvgHtml: string;
  locale?: "fr" | "ar";
}) {
  const isAr = locale === "ar";
  const [settings, setSettings] = useState<SalesPrintSettings>(DEFAULTS);
  const [hydrated, setHydrated] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [busyWord, setBusyWord] = useState(false);
  const [busyPng, setBusyPng] = useState(false);

  useEffect(() => {
    setSettings(loadSettings());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      /* ignore */
    }
  }, [settings, hydrated]);

  function applyPreset(kind: "holder" | "pitch" | "minimal") {
    if (kind === "holder") {
      setSettings((s) => ({
        ...s,
        qrSize: 110,
        showTitle: false,
        showShopName: false,
        showCustomText: false,
        showCode: true,
        showHint: true,
      }));
    } else if (kind === "pitch") {
      setSettings((s) => ({
        ...s,
        qrSize: 85,
        showTitle: true,
        showShopName: true,
        showCustomText: false,
        showCode: true,
        showHint: true,
        titleFr: s.titleFr || DEFAULTS.titleFr,
        titleAr: s.titleAr || DEFAULTS.titleAr,
      }));
    } else {
      setSettings((s) => ({
        ...s,
        qrSize: 120,
        showTitle: false,
        showShopName: false,
        showCustomText: false,
        showCode: false,
        showHint: false,
      }));
    }
    setToast(
      isAr
        ? kind === "holder"
          ? "وضع الحامل"
          : kind === "pitch"
            ? "وضع العرض"
            : "وضع بسيط"
        : kind === "holder"
          ? "Mode support"
          : kind === "pitch"
            ? "Mode présentation"
            : "Mode minimal",
    );
  }

  async function onWord() {
    if (busyWord) return;
    setBusyWord(true);
    try {
      const png = await svgToPngDataUrl(qrSvgHtml);
      const blocks: Parameters<typeof downloadWordA4>[0]["blocks"] = [];
      if (settings.showTitle) {
        if (settings.titleFr.trim()) {
          blocks.push({ kind: "title", text: settings.titleFr.trim() });
        }
        if (settings.titleAr.trim()) {
          blocks.push({
            kind: "text",
            text: settings.titleAr.trim(),
            muted: true,
          });
        }
      }
      if (settings.showShopName && settings.shopName.trim()) {
        blocks.push({ kind: "title", text: settings.shopName.trim() });
      }
      if (settings.showCustomText && settings.customText.trim()) {
        blocks.push({ kind: "text", text: settings.customText.trim() });
      }
      blocks.push({ kind: "qr", src: png, mm: settings.qrSize });
      if (settings.showCode) blocks.push({ kind: "code", text: code });
      if (settings.showHint && settings.hintText.trim()) {
        blocks.push({
          kind: "text",
          text: settings.hintText.trim(),
          muted: true,
        });
      }
      downloadWordA4({
        filename: `QR-${code}-modifiable.doc`,
        title: `QR ${code}`,
        blocks,
      });
      setToast(
        isAr
          ? "تم التحميل — افتحوا الملف في وورد وعدّلوا بحرية"
          : "Téléchargé — ouvrez le fichier dans Word et modifiez librement",
      );
    } catch {
      setToast(isAr ? "تعذّر التحميل" : "Échec du téléchargement");
    } finally {
      setBusyWord(false);
    }
  }

  async function onQrImage() {
    if (busyPng) return;
    setBusyPng(true);
    try {
      await downloadQrPng(qrSvgHtml, `QR-${code}.png`);
      setToast(isAr ? "تم تحميل صورة QR" : "Image QR téléchargée");
    } catch {
      setToast(isAr ? "تعذّر التحميل" : "Échec du téléchargement");
    } finally {
      setBusyPng(false);
    }
  }

  return (
    <div className="min-h-dvh overflow-x-hidden bg-bg text-ink">
      <Toast message={toast} onDone={() => setToast(null)} />

      <header className="no-print sticky top-0 z-20 border-b border-line bg-bg/95 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <Link
              href={backHref}
              className="text-[13px] text-muted no-underline"
            >
              {isAr ? "← رجوع" : "← Retour"}
            </Link>
            <h1 className="truncate text-lg font-semibold tracking-tight">
              {isAr ? "ورقة البيع A4" : "Feuille vente A4"}
            </h1>
            <p className="text-[12px] text-muted">
              {isAr
                ? "عدّلوا ثم اطبعوا — قبل تفعيل المتجر"
                : "Ajustez puis imprimez — avant l’activation"}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-ink px-3 py-1 font-mono text-sm text-white">
            {code}
          </span>
        </div>
      </header>

      <div className="no-print mx-auto max-w-lg space-y-5 px-4 pb-8 pt-4">
        <section>
          <p className="mb-2 text-center text-[12px] text-muted">
            {isAr ? "معاينة ورقة A4" : "Aperçu feuille A4"}
          </p>
          <div className="overflow-hidden rounded-[16px] border border-line bg-[#e8e2d8] p-3">
            <A4PreviewFrame>
              <SalesSheet
                code={code}
                qrSvgHtml={qrSvgHtml}
                settings={settings}
                mode="screen"
              />
            </A4PreviewFrame>
          </div>
        </section>

        <section className="space-y-4 rounded-[16px] border border-line bg-surface p-4">
          <div>
            <h2 className="text-base font-semibold">
              {isAr ? "إعدادات الورقة" : "Réglages de la feuille"}
            </h2>
            <p className="mt-1 text-[13px] leading-relaxed text-muted">
              {isAr
                ? "اختاروا وضعاً سريعاً أو عدّلوا يدوياً. يُحفظ تلقائياً على هذا الهاتف."
                : "Choisissez un mode rapide ou ajustez à la main. Sauvegardé auto sur ce téléphone."}
            </p>
          </div>

          <div>
            <div className="mb-2 text-[12px] font-medium text-muted">
              {isAr ? "أوضاع سريعة" : "Modes rapides"}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => applyPreset("holder")}
                className="min-h-14 rounded-[12px] border border-line bg-bg px-2 py-2 text-center active:opacity-90"
              >
                <span className="block text-[13px] font-semibold">
                  {isAr ? "حامل" : "Support"}
                </span>
                <span className="block text-[11px] text-muted">
                  {isAr ? "QR كبير" : "Grand QR"}
                </span>
              </button>
              <button
                type="button"
                onClick={() => applyPreset("pitch")}
                className="min-h-14 rounded-[12px] border border-line bg-bg px-2 py-2 text-center active:opacity-90"
              >
                <span className="block text-[13px] font-semibold">
                  {isAr ? "عرض" : "Pitch"}
                </span>
                <span className="block text-[11px] text-muted">
                  {isAr ? "+ اسم" : "+ nom"}
                </span>
              </button>
              <button
                type="button"
                onClick={() => applyPreset("minimal")}
                className="min-h-14 rounded-[12px] border border-line bg-bg px-2 py-2 text-center active:opacity-90"
              >
                <span className="block text-[13px] font-semibold">
                  {isAr ? "بسيط" : "Minimal"}
                </span>
                <span className="block text-[11px] text-muted">
                  {isAr ? "QR فقط" : "QR seul"}
                </span>
              </button>
            </div>
          </div>

          <div className="space-y-4 rounded-[12px] bg-bg p-3">
            <SizeControl
              label={isAr ? "حجم رمز QR" : "Taille du QR"}
              value={settings.qrSize}
              min={50}
              max={140}
              onChange={(qrSize) => setSettings({ ...settings, qrSize })}
            />
          </div>

          <div>
            <div className="mb-2 text-[12px] font-medium text-muted">
              {isAr ? "ماذا يظهر؟" : "Que montrer ?"}
            </div>
            <div className="flex flex-wrap gap-2">
              <Chip
                on={settings.showTitle}
                label={isAr ? "العناوين" : "Titres"}
                onClick={() =>
                  setSettings({
                    ...settings,
                    showTitle: !settings.showTitle,
                  })
                }
              />
              <Chip
                on={settings.showShopName}
                label={isAr ? "اسم المتجر" : "Nom boutique"}
                onClick={() =>
                  setSettings({
                    ...settings,
                    showShopName: !settings.showShopName,
                  })
                }
              />
              <Chip
                on={settings.showCode}
                label={isAr ? "الرمز" : "Code"}
                onClick={() =>
                  setSettings({
                    ...settings,
                    showCode: !settings.showCode,
                  })
                }
              />
              <Chip
                on={settings.showHint}
                label={isAr ? "نصيحة المسح" : "Texte scan"}
                onClick={() =>
                  setSettings({
                    ...settings,
                    showHint: !settings.showHint,
                  })
                }
              />
              <Chip
                on={settings.showCustomText}
                label={isAr ? "نص حر" : "Texte libre"}
                onClick={() =>
                  setSettings({
                    ...settings,
                    showCustomText: !settings.showCustomText,
                  })
                }
              />
            </div>
          </div>

          {settings.showShopName ? (
            <Input
              label={
                isAr
                  ? "اسم المتجر على الورقة (اختياري)"
                  : "Nom de la boutique sur la feuille (optionnel)"
              }
              value={settings.shopName}
              onChange={(e) =>
                setSettings({ ...settings, shopName: e.target.value })
              }
              placeholder={isAr ? "مثال: مقهى الورد" : "Ex: Café des Roses"}
            />
          ) : null}

          {settings.showTitle ? (
            <div className="space-y-3">
              <Input
                label={isAr ? "عنوان فرنسي" : "Titre FR"}
                value={settings.titleFr}
                onChange={(e) =>
                  setSettings({ ...settings, titleFr: e.target.value })
                }
              />
              <Input
                label={isAr ? "عنوان عربي" : "Titre AR"}
                value={settings.titleAr}
                onChange={(e) =>
                  setSettings({ ...settings, titleAr: e.target.value })
                }
                dir="rtl"
              />
            </div>
          ) : null}

          {settings.showHint ? (
            <Input
              label={isAr ? "نص المسح" : "Texte sous le QR"}
              value={settings.hintText}
              onChange={(e) =>
                setSettings({ ...settings, hintText: e.target.value })
              }
            />
          ) : null}

          {settings.showCustomText ? (
            <Textarea
              label={isAr ? "نص حر على الورقة" : "Texte libre sur la feuille"}
              value={settings.customText}
              onChange={(e) =>
                setSettings({ ...settings, customText: e.target.value })
              }
              rows={3}
              placeholder={
                isAr
                  ? "عرض اليوم، ترحيب، رقم…"
                  : "Offre du jour, accueil, numéro…"
              }
            />
          ) : null}
        </section>

        <section className="space-y-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button type="button" onClick={() => window.print()}>
            {isAr ? "طباعة ورقة A4" : "Imprimer la feuille A4"}
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={busyWord}
              onClick={() => void onWord()}
              className="flex min-h-[52px] flex-col items-center justify-center rounded-[12px] border border-line bg-surface px-2 py-2 text-center disabled:opacity-50"
            >
              <span className="text-[13px] font-semibold leading-tight">
                {busyWord ? "…" : isAr ? "ملف وورد" : "Fichier Word"}
              </span>
              <span className="text-[11px] leading-tight text-muted">
                {isAr ? "للتعديل الحر" : "Pour modifier"}
              </span>
            </button>
            <button
              type="button"
              disabled={busyPng}
              onClick={() => void onQrImage()}
              className="flex min-h-[52px] flex-col items-center justify-center rounded-[12px] border border-line bg-surface px-2 py-2 text-center disabled:opacity-50"
            >
              <span className="text-[13px] font-semibold leading-tight">
                {busyPng ? "…" : isAr ? "صورة QR فقط" : "Image QR seule"}
              </span>
              <span className="text-[11px] leading-tight text-muted">PNG</span>
            </button>
          </div>
        </section>
      </div>

      <div className="print-only">
        <SalesSheet
          code={code}
          qrSvgHtml={qrSvgHtml}
          settings={settings}
          mode="print"
        />
      </div>

      <style>{A4_PRINT_CSS}</style>
      <style>{`
        .sales-lead {
          margin: 0;
          font-size: 11pt;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #9a958c;
          font-weight: 600;
        }
        .sales-title {
          margin: 0;
          font-size: 20pt;
          font-weight: 750;
          color: #141414;
          letter-spacing: -0.02em;
          line-height: 1.25;
        }
        .sales-shop {
          margin: 0;
          font-size: 22pt;
          font-weight: 800;
          color: #141414;
          letter-spacing: -0.02em;
          line-height: 1.2;
          max-width: 160mm;
        }
      `}</style>
    </div>
  );
}
