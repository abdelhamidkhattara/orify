"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LangSwitch } from "@/components/lang-switch";
import { OrifyWordmark } from "@/components/brand/orify-logo";
import { sellerLogin } from "@/app/actions/seller";

export function SellerLogin({ locale }: { locale: "fr" | "ar" }) {
  const isAr = locale === "ar";
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4">
      <div className="absolute end-4 top-4">
        <LangSwitch locale={locale} />
      </div>
      <Card className="w-full max-w-sm">
        <OrifyWordmark size={28} className="mb-3" />
        <h1 className="text-xl font-bold">
          {isAr ? "بوابة البائع" : "Portail vendeur"}
        </h1>
        <p className="mt-1 text-[13px] text-muted">
          {isAr
            ? "الهاتف أو الاسم + كلمة المرور"
            : "Téléphone ou nom + mot de passe"}
        </p>
        <form
          className="mt-4 flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const res = await sellerLogin({ identifier, password });
              if (!res.ok) {
                setError(
                  res.error === "rate"
                    ? isAr
                      ? "محاولات كثيرة"
                      : "Trop de tentatives"
                    : isAr
                      ? "بيانات خاطئة"
                      : "Identifiants incorrects",
                );
                return;
              }
              router.refresh();
            });
          }}
        >
          <Input
            label={isAr ? "الهاتف أو الاسم" : "Téléphone ou nom"}
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            autoComplete="username"
            required
          />
          <Input
            type="password"
            label={isAr ? "كلمة المرور" : "Mot de passe"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
          {error && <p className="text-[13px] text-danger">{error}</p>}
          <Button type="submit" disabled={pending}>
            {pending ? "…" : isAr ? "دخول" : "Entrer"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
