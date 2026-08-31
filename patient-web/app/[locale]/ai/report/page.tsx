import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { getMyMedicalReports, type MedicalReportSummary } from "@/lib/api/reports-server";
import { AiReportClient } from "@/components-next/ai-report-client";

type Props = { params: Promise<{ locale: string }> };

export default async function AiHealthReportPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const token = await requirePatientAccess(locale);
  const t = await getTranslations("AiHealthReport");
  let reports: MedicalReportSummary[] = [];
  try {
    const response = await getMyMedicalReports(token);
    if (response.ok) {
      const payload: unknown = await response.json().catch(() => null);
      const list = Array.isArray(payload)
        ? payload
        : payload && typeof payload === "object" && Array.isArray((payload as { data?: unknown }).data)
          ? ((payload as { data: unknown[] }).data)
          : [];
      reports = list.filter(
        (item): item is MedicalReportSummary =>
          !!item && typeof item === "object" && typeof (item as { id?: unknown }).id === "string",
      );
    }
  } catch { reports = []; }
  return (
    <main className="main" style={{ padding: "24px 16px", maxWidth: 760, margin: "0 auto" }}>
      <h1>{t("title")}</h1>
      <p style={{ opacity: 0.75 }}>{t("disclaimer")}</p>
      <AiReportClient reports={reports} locale={locale} />
    </main>
  );
}
