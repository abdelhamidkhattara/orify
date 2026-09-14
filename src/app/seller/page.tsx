import { getLocale } from "@/lib/locale";
import { listMyCodes } from "@/app/actions/seller";
import { SellerDashboard } from "@/components/seller/dashboard";

export default async function SellerPage() {
  const locale = await getLocale();
  const { unused, live } = await listMyCodes();

  return (
    <SellerDashboard locale={locale} unused={unused} live={live} />
  );
}
