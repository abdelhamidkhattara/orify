import { getLocale } from "@/lib/locale";
import { listLeads, listCodes } from "@/app/actions/owner";
import { LeadsClient } from "@/components/owner/leads-client";

type Props = { searchParams: Promise<{ f?: string }> };

export default async function OwnerLeadsPage({ searchParams }: Props) {
  const locale = await getLocale();
  const sp = await searchParams;
  const filter = sp.f || "new";
  const leads = await listLeads(filter === "all" ? undefined : filter);
  const codes = await listCodes("unused");
  return (
    <LeadsClient
      locale={locale}
      initial={leads}
      unusedCodes={codes}
      filter={filter}
    />
  );
}
