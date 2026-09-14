import Link from "next/link";
import { Card } from "@/components/ui/card";

export function PrintAccessMessage({
  locale,
  title,
  body,
  backHref,
  backLabel,
}: {
  locale: "fr" | "ar";
  title: string;
  body: string;
  backHref: string;
  backLabel?: string;
}) {
  const isAr = locale === "ar";
  return (
    <div
      className="flex min-h-dvh flex-col items-center justify-center bg-bg px-4 text-ink"
      dir={isAr ? "rtl" : "ltr"}
    >
      <Card className="w-full max-w-sm space-y-4 text-center">
        <h1 className="text-lg font-semibold">{title}</h1>
        <p className="text-[15px] text-muted">{body}</p>
        <Link
          href={backHref}
          className="inline-flex min-h-12 items-center justify-center rounded-[12px] bg-ink px-4 text-sm font-medium text-white no-underline"
        >
          {backLabel || (isAr ? "رجوع" : "Retour")}
        </Link>
      </Card>
    </div>
  );
}
