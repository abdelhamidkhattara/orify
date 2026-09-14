"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/utils";

export function LangSwitch({
  locale,
  className,
}: {
  locale: "fr" | "ar";
  className?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function setLocale(next: "fr" | "ar") {
    if (next === locale) return;
    start(async () => {
      await fetch("/api/locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: next }),
      });
      router.refresh();
    });
  }

  return (
    <div
      className={cn(
        "inline-flex rounded-full border border-line bg-surface p-0.5 text-[13px] font-medium",
        pending && "opacity-60",
        className,
      )}
      role="group"
      aria-label="Language"
    >
      <button
        type="button"
        onClick={() => setLocale("fr")}
        className={cn(
          "min-h-9 min-w-10 rounded-full px-3 transition-colors",
          locale === "fr"
            ? "bg-ink text-white"
            : "text-muted hover:text-ink",
        )}
      >
        FR
      </button>
      <button
        type="button"
        onClick={() => setLocale("ar")}
        className={cn(
          "min-h-9 min-w-10 rounded-full px-3 transition-colors",
          locale === "ar"
            ? "bg-ink text-white"
            : "text-muted hover:text-ink",
        )}
      >
        ع
      </button>
    </div>
  );
}
