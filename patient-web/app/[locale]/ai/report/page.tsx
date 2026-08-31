import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { getMyMedicalReports } from "@/lib/api/reports-server";
import { AiReportClient } from "@/components-next/ai-report-client";

type Props = { params: Promise<{ locale: string }> };

export default async function AiHealthReportPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requirePatientAccess(locale);
  const t = await getTranslations("AiHealthReport");
  let reports: Awaited<ReturnType<typeof getMyMedicalReports>> = [];
  try { reports = await getMyMedicalReports(); } catch { reports = []; }
  return (
    <main className="main" style={{ padding: "24px 16px", maxWidth: 760, margin: "0 auto" }}>
      <h1>{t("title")}</h1>
      <p style={{ opacity: 0.75 }}>{t("disclaimer")}</p>
      <AiReportClient reports={reports} locale={locale} />
    </main>
  );
}
