"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LangSwitch } from "@/components/lang-switch";
import { OrifyWordmark } from "@/components/brand/orify-logo";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { claimShopFull } from "@/app/actions/claim";

type Locale = "fr" | "ar";

const SOCIALS = [
  "whatsapp",
  "instagram",
  "facebook",
  "tiktok",
  "maps",
  "telegram",
  "snapchat",
  "youtube",
  "email",
  "review",
  "website",
] as const;

export function ClaimWizard({
  code,
  locale,
}: {
  code: string;
  locale: Locale;
}) {
  const isAr = locale === "ar";
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const [step, setStep] = useState<1 | 2>(1);

  const [form, setForm] = useState({
    name: "",
    password: "",
    confirm: "",
    phone: "",
    pageLocale: "ar" as "ar" | "fr",
    slogan: "",
  });

  const [links, setLinks] = useState<Record<string, string>>(
    Object.fromEntries(SOCIALS.map((k) => [k, ""])),
  );

  function onStep1(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (form.password.length < 6) {
      setError(isAr ? "6 أحرف على الأقل" : "Au moins 6 caractères");
      return;
    }
    if (form.password !== form.confirm) {
      setError(
        isAr
          ? "كلمتا المرور غير متطابقتين"
          : "Les mots de passe ne correspondent pas",
      );
      return;
    }
    setStep(2);
  }

  function onFinish(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    start(async () => {
      const res = await claimShopFull({
        code,
        name: form.name,
        password: form.password,
        phone: form.phone,
        pageLocale: form.pageLocale,
        slogan: form.slogan,
        links,
      });
      if (!res.ok) {
        setError(res.error || "Error");
        return;
      }
      router.push(`/${code}`);
      router.refresh();
    });
  }

  const socialLabel = (k: string) => {
    const map: Record<string, [string, string]> = {
      whatsapp: ["WhatsApp", "واتساب"],
      instagram: ["Instagram", "إنستغرام"],
      facebook: ["Facebook", "فيسبوك"],
      tiktok: ["TikTok", "تيك توك"],
      maps: ["Google Maps", "خرائط"],
      telegram: ["Telegram", "تيليغرام"],
      snapchat: ["Snapchat", "سناب"],
      youtube: ["YouTube", "يوتيوب"],
      email: ["Email", "البريد"],
      review: ["Avis Google", "تقييم قوقل"],
      website: ["Site web", "الموقع"],
    };
    return isAr ? map[k][1] : map[k][0];
  };

  return (
    <div className="flex min-h-dvh flex-col items-center px-4 py-6">
      <div className="mb-6 flex w-full max-w-md items-center justify-between">
        <OrifyWordmark size={28} />
        <LangSwitch locale={locale} />
      </div>

      <Card className="w-full max-w-md">
        <div className="mb-1 flex items-center justify-between gap-3">
          <h1 className="text-[1.45rem] font-bold leading-tight text-ink">
            {step === 1
              ? isAr
                ? "هذه الصفحة لكم"
                : "Cette page est à vous"
              : isAr
                ? "ماذا لديكم؟"
                : "Qu’avez-vous ?"}
          </h1>
          <span className="shrink-0 rounded-full bg-ink px-3 py-1 font-mono text-sm text-white">
            {code}
          </span>
        </div>
        <p className="mb-5 text-[15px] text-muted">
          {step === 1
            ? isAr
              ? "أنشئوا الصفحة الآن — مباشرة فوراً."
              : "Créez la page maintenant — en ligne tout de suite."
            : isAr
              ? "املأوا ما عندكم فقط. الباقي لاحقاً من الإدارة."
              : "Remplissez seulement ce que vous avez. Le reste plus tard dans Admin."}
        </p>

        {step === 1 ? (
          <form onSubmit={onStep1} className="flex flex-col gap-3">
            <Input
              label={isAr ? "اسم المتجر" : "Nom de la boutique"}
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <Input
              label={isAr ? "رقمكم" : "Votre téléphone"}
              type="tel"
              inputMode="tel"
              required
              hint="05… / 06… / 07…"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <Input
              label={isAr ? "شعار قصير (اختياري)" : "Slogan (optionnel)"}
              value={form.slogan}
              onChange={(e) => setForm({ ...form, slogan: e.target.value })}
            />
            <div>
              <div className="mb-1.5 text-[13px] font-medium text-muted">
                {isAr ? "لغة الصفحة للزبائن" : "Langue de la page clients"}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ["ar", isAr ? "العربية" : "Arabe"],
                    ["fr", isAr ? "الفرنسية" : "Français"],
                  ] as const
                ).map(([v, label]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setForm({ ...form, pageLocale: v })}
                    className={`min-h-12 rounded-xl border text-sm font-medium ${
                      form.pageLocale === v
                        ? "border-ink bg-ink text-white"
                        : "border-line bg-surface"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <Input
              label={isAr ? "كلمة المرور" : "Mot de passe"}
              type="password"
              required
              minLength={6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            <Input
              label={isAr ? "تأكيد" : "Confirmer"}
              type="password"
              required
              value={form.confirm}
              onChange={(e) => setForm({ ...form, confirm: e.target.value })}
            />
            {error && <p className="text-[13px] text-danger">{error}</p>}
            <Button type="submit" className="mt-1">
              {isAr ? "متابعة" : "Continuer"}
            </Button>
          </form>
        ) : (
          <form onSubmit={onFinish} className="flex flex-col gap-3">
            {SOCIALS.map((key) => (
              <Input
                key={key}
                label={socialLabel(key)}
                value={links[key]}
                onChange={(e) =>
                  setLinks({ ...links, [key]: e.target.value })
                }
                placeholder={
                  key === "whatsapp" || key === "telegram"
                    ? "0555…"
                    : key === "email"
                      ? "email@"
                      : "https://…"
                }
              />
            ))}
            {error && <p className="text-[13px] text-danger">{error}</p>}
            <Button type="submit" disabled={pending} className="mt-1">
              {pending
                ? "…"
                : isAr
                  ? "أنشئ الصفحة"
                  : "Créer la page"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setStep(1)}
            >
              {isAr ? "رجوع" : "Retour"}
            </Button>
            <p className="text-center text-[13px] text-muted">
              {isAr ? "للإدارة لاحقاً:" : "Admin plus tard :"}{" "}
              <bdi className="font-mono text-ink">/{code}/admin</bdi>
            </p>
          </form>
        )}
      </Card>
    </div>
  );
}
