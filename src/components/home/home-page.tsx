"use client";

import { useState, useTransition } from "react";
import { LangSwitch } from "@/components/lang-switch";
import { OrifyWordmark } from "@/components/brand/orify-logo";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { submitLead } from "@/app/actions/leads";

type Locale = "fr" | "ar";

type Props = {
  locale: Locale;
  title: string;
  body: string;
  cta: string;
};

const OPTIONAL = [
  "whatsapp",
  "instagram",
  "facebook",
  "tiktok",
  "maps",
  "telegram",
  "snapchat",
  "youtube",
  "email",
  "website",
  "googleReview",
  "address",
  "hours",
] as const;

export function HomePage({ locale, title, body, cta }: Props) {
  const isAr = locale === "ar";
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [showMore, setShowMore] = useState(false);

  const facts = isAr
    ? [
        "الصفحة جاهزة في نفس اليوم",
        "تعديل من الهاتف",
        "ورقة واحدة على الطاولة",
      ]
    : [
        "Page en ligne le jour même",
        "Ils modifient depuis le téléphone",
        "Un papier sur le comptoir",
      ];

  function label(k: (typeof OPTIONAL)[number]) {
    const fr: Record<string, string> = {
      whatsapp: "WhatsApp",
      instagram: "Instagram",
      facebook: "Facebook",
      tiktok: "TikTok",
      maps: "Google Maps",
      telegram: "Telegram",
      snapchat: "Snapchat",
      youtube: "YouTube",
      email: "Email",
      website: "Site web",
      googleReview: "Avis Google",
      address: "Adresse",
      hours: "Horaires",
    };
    const ar: Record<string, string> = {
      whatsapp: "واتساب",
      instagram: "إنستغرام",
      facebook: "فيسبوك",
      tiktok: "تيك توك",
      maps: "خرائط قوقل",
      telegram: "تيليغرام",
      snapchat: "سناب شات",
      youtube: "يوتيوب",
      email: "البريد",
      website: "الموقع",
      googleReview: "تقييم قوقل",
      address: "العنوان",
      hours: "أوقات العمل",
    };
    return isAr ? ar[k] : fr[k];
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    const extras: Record<string, string> = {};
    for (const k of OPTIONAL) {
      const v = String(fd.get(k) || "").trim();
      if (v) extras[k] = v;
    }
    start(async () => {
      const res = await submitLead({
        shopName: String(fd.get("shopName") || ""),
        contactName: String(fd.get("contactName") || ""),
        phone: String(fd.get("phone") || ""),
        city: String(fd.get("city") || ""),
        message: String(fd.get("message") || ""),
        locale,
        extras,
      });
      if (!res.ok) {
        setError(res.error || "Error");
        return;
      }
      setDone(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  if (done) {
    return (
      <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(100% 70% at 50% 0%, rgba(15,123,74,0.14), transparent 55%), #F6F4F0",
          }}
        />
        <div className="absolute end-4 top-4">
          <LangSwitch locale={locale} />
        </div>
        <div className="relative w-full max-w-md text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-ok text-2xl text-white">
            ✓
          </div>
          <h1 className="text-[1.85rem] font-bold tracking-tight text-ink">
            {isAr ? "وصلت رسالتكم" : "Message bien reçu"}
          </h1>
          <p className="mt-3 text-[1.05rem] leading-relaxed text-muted">
            {isAr
              ? "شكراً لثقتكم. سنتصل بكم قريباً لنجهّز صفحتكم ورمزكم."
              : "Merci pour votre confiance. Nous vous contactons bientôt pour préparer votre page et votre QR."}
          </p>
          <a
            href="/DEMO"
            className="mt-8 inline-flex min-h-[52px] items-center justify-center rounded-[12px] border border-line bg-surface px-6 font-medium text-ink no-underline"
          >
            {isAr ? "شاهدوا مثالاً حياً" : "Voir un exemple live"}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 80% at 100% 0%, rgba(200,30,58,0.10), transparent 55%), radial-gradient(90% 60% at 0% 100%, rgba(20,20,20,0.05), transparent 50%), #F6F4F0",
        }}
      />

      <div className="relative mx-auto flex w-full max-w-md flex-col px-4 pb-10 pt-5">
        <header className="mb-8 flex items-center justify-between">
          <OrifyWordmark size={30} />
          <LangSwitch locale={locale} />
        </header>

        <section className="mb-6">
          <h1 className="text-[1.85rem] font-bold leading-[1.15] tracking-tight text-ink sm:text-[2.1rem]">
            {title}
          </h1>
          <p className="mt-3 text-[1.05rem] leading-relaxed text-muted">
            {body}
          </p>
        </section>

        <a
          href="/DEMO"
          className="mb-6 block overflow-hidden rounded-[16px] border border-line bg-ink text-white no-underline shadow-[0_12px_40px_rgba(20,20,20,0.12)] transition-transform active:scale-[0.99]"
        >
          <div className="flex items-center gap-4 px-4 py-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/jarir-logo.svg"
              alt="Jarir"
              className="h-14 w-14 rounded-xl bg-white/10 object-contain p-1"
            />
            <div className="min-w-0 flex-1 text-start">
              <div className="text-[13px] text-white/60">
                {isAr ? "مثال حي" : "Exemple live"}
              </div>
              <div className="truncate font-semibold">
                {isAr ? "مكتبة جرير" : "Jarir Bookstore"}
              </div>
              <div className="truncate text-[13px] text-white/70">
                {isAr
                  ? "امسح أو اضغط لترى النتيجة"
                  : "Scannez ou ouvrez le résultat"}
              </div>
            </div>
            <span className="text-white/50">›</span>
          </div>
        </a>

        <ul className="mb-6 space-y-2.5">
          {facts.map((f) => (
            <li
              key={f}
              className="flex items-start gap-2.5 text-[15px] text-ink"
            >
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              {f}
            </li>
          ))}
        </ul>

        <Card className="p-5">
          <form onSubmit={onSubmit} className="flex flex-col gap-3">
            <h2 className="mb-1 text-lg font-semibold text-ink">
              {isAr ? "اطلب رمزك" : "Demander mon QR"}
            </h2>
            <Input
              label={isAr ? "اسم المتجر" : "Nom de la boutique"}
              name="shopName"
              required
            />
            <Input
              label={isAr ? "اسمك" : "Votre nom"}
              name="contactName"
              required
              autoComplete="name"
            />
            <Input
              label={isAr ? "الهاتف" : "Téléphone"}
              name="phone"
              type="tel"
              inputMode="tel"
              required
              hint="05… / 06… / 07…"
            />
            <Input label={isAr ? "المدينة" : "Ville"} name="city" />

            <button
              type="button"
              onClick={() => setShowMore((v) => !v)}
              className="min-h-11 rounded-xl border border-dashed border-line text-sm font-medium text-muted"
            >
              {showMore
                ? isAr
                  ? "إخفاء الروابط الاختيارية"
                  : "Masquer les liens optionnels"
                : isAr
                  ? "+ أضفوا حساباتكم (اختياري)"
                  : "+ Ajoutez vos réseaux (optionnel)"}
            </button>

            {showMore && (
              <div className="flex flex-col gap-3 rounded-xl bg-bg p-3">
                <p className="text-[13px] text-muted">
                  {isAr
                    ? "لا شيء إلزامي — املأوا ما عندكم فقط"
                    : "Rien d’obligatoire — seulement ce que vous avez"}
                </p>
                {OPTIONAL.map((k) => (
                  <Input key={k} label={label(k)} name={k} />
                ))}
              </div>
            )}

            <Textarea
              label={isAr ? "رسالة (اختياري)" : "Message (optionnel)"}
              name="message"
              rows={3}
            />
            {error && <p className="text-[13px] text-danger">{error}</p>}
            <Button type="submit" disabled={pending} className="mt-1">
              {pending ? "…" : cta}
            </Button>
          </form>
        </Card>

        <p className="mt-6 text-center text-[13px] text-muted">
          {isAr ? "بائع؟" : "Vendeur ?"}{" "}
          <a href="/seller" className="font-medium text-ink underline">
            {isAr ? "دخول البائعين" : "Espace vendeur"}
          </a>
        </p>
      </div>
    </div>
  );
}
