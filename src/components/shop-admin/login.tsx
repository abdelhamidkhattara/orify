"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LangSwitch } from "@/components/lang-switch";
import { OrifyWordmark } from "@/components/brand/orify-logo";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { shopLogin } from "@/app/actions/shop-admin";

export function ShopAdminLogin({
  code,
  shopName,
  locale,
}: {
  code: string;
  shopName: string;
  locale: "fr" | "ar";
}) {
  const isAr = locale === "ar";
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  return (
    <div className="flex min-h-dvh flex-col items-center px-4 py-6">
      <div className="mb-8 flex w-full max-w-md items-center justify-between">
        <OrifyWordmark size={28} />
        <LangSwitch locale={locale} />
      </div>
      <Card className="w-full max-w-md">
        <h1 className="text-xl font-bold">
          {isAr ? "الإدارة" : "Administration"}
        </h1>
        <p className="mt-1 text-muted">
          <bdi>{shopName}</bdi> · <span className="font-mono">{code}</span>
        </p>
        <form
          className="mt-5 flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            setError("");
            start(async () => {
              const res = await shopLogin(code, password);
              if (!res.ok) {
                setError(
                  res.error === "rate"
                    ? isAr
                      ? "محاولات كثيرة. حاول لاحقاً."
                      : "Trop d’essais. Réessayez plus tard."
                    : isAr
                      ? "كلمة مرور خاطئة"
                      : "Mot de passe incorrect",
                );
                return;
              }
              router.refresh();
            });
          }}
        >
          <Input
            label={isAr ? "كلمة المرور" : "Mot de passe"}
            type="password"
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
