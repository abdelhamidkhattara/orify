import { getLocale } from "@/lib/locale";
import { listCodes, listAgents } from "@/app/actions/owner";
import { CodesClient } from "@/components/owner/codes-client";

type Props = { searchParams: Promise<{ f?: string }> };

export default async function OwnerCodesPage({ searchParams }: Props) {
  const locale = await getLocale();
  const sp = await searchParams;
  const filter = sp.f || "all";
  const codes = await listCodes(filter === "all" ? undefined : filter);
  const agents = await listAgents();
  return (
    <CodesClient locale={locale} initial={codes} agents={agents} filter={filter} />
  );
}
