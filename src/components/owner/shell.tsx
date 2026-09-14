"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LangSwitch } from "@/components/lang-switch";
import { OrifyWordmark } from "@/components/brand/orify-logo";
import { cn } from "@/lib/utils";

const ownerBase = ""; // rewritten from secret path to /owner

export function OwnerShell({
  locale,
  children,
}: {
  locale: "fr" | "ar";
  children: React.ReactNode;
}) {
  const isAr = locale === "ar";
  const pathname = usePathname();

  const items = [
    { href: "/owner", label: isAr ? "الرئيسية" : "Accueil", match: Exact },
    { href: "/owner/codes", label: "QR", match: Prefix },
    {
      href: "/owner/shops",
      label: isAr ? "المتاجر" : "Boutiques",
      match: Prefix,
    },
    {
      href: "/owner/leads",
      label: isAr ? "الطلبات" : "Demandes",
      match: Prefix,
    },
    {
      href: "/owner/settings",
      label: isAr ? "المزيد" : "Plus",
      match: Prefix,
    },
  ];

  return (
    <div className="min-h-dvh bg-bg">
      <div className="mx-auto flex min-h-dvh max-w-6xl">
        {/* Desktop rail */}
        <aside className="hidden w-56 shrink-0 border-e border-line bg-surface p-4 md:block">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <OrifyWordmark size={26} />
              <div className="mt-1 text-[11px] font-medium text-muted">
                Owner
              </div>
            </div>
          </div>
          <nav className="flex flex-col gap-1">
            {items.map((it) => {
              const active = it.match(pathname, it.href);
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  className={cn(
                    "min-h-11 rounded-xl px-3 py-2 text-sm font-medium",
                    active
                      ? "bg-ink text-white"
                      : "text-muted hover:bg-bg hover:text-ink",
                  )}
                >
                  {it.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-6">
            <LangSwitch locale={locale} />
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col pb-20 md:pb-0">
          <header className="flex items-center justify-between border-b border-line px-4 py-3 md:hidden">
            <OrifyWordmark size={26} />
            <LangSwitch locale={locale} />
          </header>
          <main className="flex-1 p-4 md:p-6">{children}</main>
        </div>
      </div>

      {/* Phone bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-line bg-surface/95 backdrop-blur md:hidden">
        {items.map((it) => {
          const active = it.match(pathname, it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                "flex min-h-14 flex-1 flex-col items-center justify-center text-[11px] font-medium",
                active ? "text-accent" : "text-muted",
              )}
            >
              {it.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function Exact(pathname: string, href: string) {
  return pathname === href;
}
function Prefix(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

void ownerBase;
