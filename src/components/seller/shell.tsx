"use client";

import { LangSwitch } from "@/components/lang-switch";
import { OrifyWordmark } from "@/components/brand/orify-logo";
import { Button } from "@/components/ui/button";
import { sellerLogout } from "@/app/actions/seller";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function SellerShell({
  locale,
  agentName,
  children,
}: {
  locale: "fr" | "ar";
  agentName: string;
  children: React.ReactNode;
}) {
  const isAr = locale === "ar";
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <div className="min-h-dvh bg-bg">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3">
          <div>
            <OrifyWordmark size={26} />
            <div className="mt-0.5 text-[13px] text-muted">{agentName}</div>
          </div>
          <div className="flex items-center gap-2">
            <LangSwitch locale={locale} />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="w-auto min-w-[88px]"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  await sellerLogout();
                  router.refresh();
                })
              }
            >
              {isAr ? "خروج" : "Sortir"}
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-2xl p-4">{children}</main>
    </div>
  );
}
