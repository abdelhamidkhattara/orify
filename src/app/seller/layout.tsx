import { getLocale } from "@/lib/locale";
import { ensureDb } from "@/lib/db/ensure";
import { requireAgent } from "@/app/actions/seller";
import { SellerLogin } from "@/components/seller/login";
import { SellerShell } from "@/components/seller/shell";

export default async function SellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await ensureDb();
  const locale = await getLocale();
  const ctx = await requireAgent();

  if (!ctx) {
    return <SellerLogin locale={locale} />;
  }

  return (
    <SellerShell locale={locale} agentName={ctx.agent.name}>
      {children}
    </SellerShell>
  );
}
