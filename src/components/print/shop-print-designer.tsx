"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Toast } from "@/components/ui/toast";
import { updatePrintSettings } from "@/app/actions/shop-admin";
import type { PrintSettings } from "@/lib/db/schema";
import { A4PreviewFrame } from "@/components/print/a4-preview-frame";
import {
  A4_PRINT_CSS,
  absoluteAssetUrl,
  downloadQrPng,
  downloadWordA4,
  svgToPngDataUrl,
} from "@/lib/print-export";

type Props = {
  code: string;
  shopName: string;
  slogan: string;
  logoUrl: string | null;
  qrSvgHtml: string;
  initial: PrintSettings;
  locale: "fr" | "ar";
};

function A4Sheet({
  code,
  shopName,
  slogan,
  logoUrl,
  qrSvgHtml,
  settings,
  mode,
}: {
  code: string;
  shopName: string;
  slogan: string;
  logoUrl: string | null;
  qrSvgHtml: string;
  settings: PrintSettings;
  mode: "screen" | "print";
}) {
  const qrMm = Math.min(140, Math.max(30, settings.qrSize));
  const logoMm = Math.min(120, Math.max(20, settings.logoSize));

  return (
    <div
      className={
        mode === "print" ? "a4-sheet a4-sheet-print" : "a4-sheet a4-sheet-screen"
      }
    >
      <div className="a4-inner">
        {settings.showLogo && logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt=""
            className="a4-logo"
            style={{
              width: `${logoMm}mm`,
              height: "auto",
              maxHeight: `${logoMm}mm`,
            }}
          />
        ) : null}

        {settings.showName ? <h1 className="a4-name">{shopName}</h1> : null}

        {settings.showSlogan && slogan ? (
          <p className="a4-slogan">{slogan}</p>
        ) : null}

        {settings.showCustomText && settings.customText ? (
          <p className="a4-custom">{settings.customText}</p>
        ) : null}

        <hr className="a4-rule" />

        <div
          className="a4-qr-wrap"
          style={{ width: `${qrMm + 6}mm`, height: `${qrMm + 6}mm` }}
          dangerouslySetInnerHTML={{
            __html: qrSvgHtml.replace(
              "<svg",
              `<svg width="${qrMm}mm" height="${qrMm}mm" style="width:${qrMm}mm;height:${qrMm}mm;display:block"`,
            ),
          }}
        />

        {settings.showCode ? <div className="a4-code">{code}</div> : null}

        {settings.showHint ? (
          <p className="a4-hint">Scannez pour ouvrir · امسح للفتح</p>
        ) : null}
      </div>
    </div>
  );
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

export function ShopPrintDesigner({
  code,
  shopName,
  slogan,
  logoUrl,
  qrSvgHtml,
  initial,
  locale,
}: Props) {
  const isAr = locale === "ar";
  const [settings, setSettings] = useState<PrintSettings>(initial);
  const [toast, setToast] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [busyWord, setBusyWord] = useState(false);
  const [busyPng, setBusyPng] = useState(false);

  async function onWord() {
    if (busyWord) return;
    setBusyWord(true);
    try {
      const png = await svgToPngDataUrl(qrSvgHtml);
      const blocks: Parameters<typeof downloadWordA4>[0]["blocks"] = [];
      if (settings.showLogo && logoUrl) {
        blocks.push({
          kind: "logo",
          src: absoluteAssetUrl(logoUrl),
          mm: settings.logoSize,
        });
      }
      if (settings.showName) blocks.push({ kind: "title", text: shopName });
      if (settings.showSlogan && slogan) {
        blocks.push({ kind: "text", text: slogan, muted: true });
      }
      if (settings.showCustomText && settings.customText) {
        blocks.push({ kind: "text", text: settings.customText });
      }
      blocks.push({ kind: "qr", src: png, mm: settings.qrSize });
      if (settings.showCode) blocks.push({ kind: "code", text: code });
      if (settings.showHint) {
        blocks.push({
          kind: "text",
          text: "Scannez pour ouvrir · امسح للفتح",
          muted: true,
        });
      }
      downloadWordA4({
        filename: `QR-${code}-modifiable.doc`,
        title: `${shopName} — QR`,
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
      setToast(
        isAr
          ? "تم تحميل صورة QR"
          : "Image QR téléchargée",
      );
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
              href={`/${code}/admin`}
              className="text-[13px] text-muted no-underline"
            >
              {isAr ? "← الإدارة" : "← Admin"}
            </Link>
            <h1 className="truncate text-lg font-semibold tracking-tight">
              {isAr ? "ورقة QR للطباعة" : "Feuille QR à imprimer"}
            </h1>
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
              <A4Sheet
                code={code}
                shopName={shopName}
                slogan={slogan}
                logoUrl={logoUrl}
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
              {isAr ? "تخصيص الورقة" : "Personnaliser la feuille"}
            </h2>
            <p className="mt-1 text-[13px] leading-relaxed text-muted">
              {isAr
                ? "عدّلوا الأحجام، اطبعوا، أو حمّلوا وورد للتعديل الحر."
                : "Ajustez les tailles, imprimez, ou téléchargez Word pour modifier librement."}
            </p>
          </div>

          <div className="space-y-4 rounded-[12px] bg-bg p-3">
            <SizeControl
              label={isAr ? "حجم الشعار" : "Taille du logo"}
              value={settings.logoSize}
              min={20}
              max={120}
              onChange={(logoSize) => setSettings({ ...settings, logoSize })}
            />
            <SizeControl
              label={isAr ? "حجم رمز QR" : "Taille du QR"}
              value={settings.qrSize}
              min={40}
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
                on={settings.showLogo}
                label={isAr ? "الشعار" : "Logo"}
                onClick={() =>
                  setSettings({ ...settings, showLogo: !settings.showLogo })
                }
              />
              <Chip
                on={settings.showName}
                label={isAr ? "الاسم" : "Nom"}
                onClick={() =>
                  setSettings({ ...settings, showName: !settings.showName })
                }
              />
              <Chip
                on={settings.showSlogan}
                label={isAr ? "الشعار النصي" : "Slogan"}
                onClick={() =>
                  setSettings({
                    ...settings,
                    showSlogan: !settings.showSlogan,
                  })
                }
              />
              <Chip
                on={settings.showCode}
                label={isAr ? "الرمز" : "Code"}
                onClick={() =>
                  setSettings({ ...settings, showCode: !settings.showCode })
                }
              />
              <Chip
                on={settings.showHint}
                label={isAr ? "نصيحة المسح" : "Texte scan"}
                onClick={() =>
                  setSettings({ ...settings, showHint: !settings.showHint })
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

          {settings.showCustomText ? (
            <Textarea
              label={isAr ? "نصكم الحر" : "Votre texte libre"}
              value={settings.customText}
              onChange={(e) =>
                setSettings({ ...settings, customText: e.target.value })
              }
              rows={3}
            />
          ) : null}
        </section>

        {/* Actions in normal scroll — never clipped by a fixed bar */}
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
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await updatePrintSettings(code, settings);
                setToast(
                  res.ok
                    ? isAr
                      ? "تم حفظ الإعدادات"
                      : "Réglages enregistrés"
                    : isAr
                      ? "خطأ"
                      : "Erreur",
                );
              })
            }
          >
            {pending
              ? "…"
              : isAr
                ? "حفظ هذه الإعدادات"
                : "Enregistrer ces réglages"}
          </Button>
        </section>
      </div>

      <div className="print-only">
        <A4Sheet
          code={code}
          shopName={shopName}
          slogan={slogan}
          logoUrl={logoUrl}
          qrSvgHtml={qrSvgHtml}
          settings={settings}
          mode="print"
        />
      </div>

      <style>{A4_PRINT_CSS}</style>
    </div>
  );
}
