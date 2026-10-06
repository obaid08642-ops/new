import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { pickTab } from "@/lib/health/view";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { InviteTab, JoinTab, ScanTab } from "@/components-next/family/add-family";
import { HealthTabs } from "@/components-next/health/health-kit";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ tab?: string | string[]; code?: string | string[] }> };
const TABS = ["invite", "join", "scan"] as const;

/**
 * Add or join (merge map F): one screen with the tabs Invite | Join with code | Scan QR in `?tab=`. It replaces the invite,
 * join and scan screens (their old routes and `/health/add-family-member` redirect here, keeping `code`).
 */
export default async function FamilyAddPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const query = await searchParams;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("FamilyWeb");
  await requirePatientAccess(locale);
  const tab = pickTab(query.tab, TABS, "invite");
  const code = Array.isArray(query.code) ? query.code[0] : query.code;
  return (
    <ConsultPage locale={locale} title={t("addTitle")} backHref={`/${locale}/family`}>
      <HealthTabs label={t("addTitle")} base={`/${locale}/family/add`} active={tab} options={[
        { value: "invite", label: t("tabInvite") },
        { value: "join", label: t("tabJoin") },
        { value: "scan", label: t("tabScan") },
      ]} />
      {tab === "invite" ? <InviteTab /> : tab === "join" ? <JoinTab locale={locale} initialCode={code ?? ""} /> : <ScanTab locale={locale} />}
    </ConsultPage>
  );
}
