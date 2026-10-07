import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireAdminAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { CampaignReport } from "@/components-next/analytics/CampaignReport";

type Props = { params: Promise<{ locale: string }> };

export default async function AdminAnalyticsPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requireAdminAccess(locale);
  const t = await getTranslations("AdminAnalytics");
  return <main className="main">
    <h1 className="mb-6 text-2xl font-bold">{t("title") || "Analytics"}</h1>
    <CampaignReport />
  </main>;
}