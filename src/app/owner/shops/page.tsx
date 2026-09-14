import { getLocale } from "@/lib/locale";
import { listShopsForOwner } from "@/app/actions/owner";
import { ShopsClient } from "@/components/owner/shops-client";

export default async function OwnerShopsPage() {
  const locale = await getLocale();
  const shops = await listShopsForOwner();
  return <ShopsClient locale={locale} initial={shops} />;
}
