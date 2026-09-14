"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LangSwitch } from "@/components/lang-switch";
import { OrifyWordmark } from "@/components/brand/orify-logo";
import { ownerLogin } from "@/app/actions/owner";

export function OwnerLogin({ locale }: { locale: "fr" | "ar" }) {
  const isAr = locale === "ar";
  const router = useRouter();
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
        <h1 className="text-xl font-bold">{isAr ? "دخول" : "Accès"}</h1>
        <form
          className="mt-4 flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const res = await ownerLogin(password);
              if (!res.ok) {
                setError(
                  isAr ? "كلمة مرور خاطئة" : "Mot de passe incorrect",
                );
                return;
              }
              router.refresh();
            });
          }}
        >
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
