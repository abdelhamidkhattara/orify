import { getLocale } from "@/lib/locale";
import { listAgents } from "@/app/actions/owner";
import { db } from "@/lib/db";
import { ownerSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getAppUrl, getQrBaseUrl } from "@/lib/env";
import { SettingsClient } from "@/components/owner/settings-client";

export default async function OwnerSettingsPage() {
  const locale = await getLocale();
  const agents = await listAgents();
  const [settings] = await db
    .select()
    .from(ownerSettings)
    .where(eq(ownerSettings.id, "main"))
    .limit(1);

  return (
    <SettingsClient
      locale={locale}
      agents={agents}
      settings={
        settings || {
          homeTitleFr: "",
          homeTitleAr: "",
          homeBodyFr: "",
          homeBodyAr: "",
          homeCtaFr: "",
          homeCtaAr: "",
        }
      }
      appUrl={getAppUrl()}
      qrBaseUrl={getQrBaseUrl()}
    />
  );
}
