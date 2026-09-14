import { getOwnerSession } from "@/lib/auth";
import { getLocale } from "@/lib/locale";
import { ensureDb } from "@/lib/db/ensure";
import { OwnerLogin } from "@/components/owner/login";
import { OwnerShell } from "@/components/owner/shell";

export default async function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await ensureDb();
  const session = await getOwnerSession();
  const locale = await getLocale();

  if (!session) {
    return <OwnerLogin locale={locale} />;
  }

  return <OwnerShell locale={locale}>{children}</OwnerShell>;
}
