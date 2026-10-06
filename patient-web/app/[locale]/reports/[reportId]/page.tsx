import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { formatDate } from "@/lib/format-date";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { Hero, SectionCard } from "@/components-next/consult/consult-parts";
import styles from "@/components-next/consult/consult.module.css";

type Props = { params: Promise<{ locale: string; reportId: string }> };

const FIELDS = ["summary", "diagnosis", "recommendations", "doctor_name", "facility_name"] as const;

/**
 * One medical report (merge map, section 1: stays a detail screen, opened from the Reports tab of the records screen):
 * its title and date, the fields the report has (summary, diagnosis, recommendations, doctor, facility) and its body
 * (GET /medical-reports/:id).
 */
export default async function ReportDetailPage({ params }: Props) {
  const { locale, reportId } = await params;
  if (!isLocale(locale) || !/^[A-Za-z0-9-]{8,64}$/.test(reportId)) notFound();
  setRequestLocale(locale);
  const token = await requirePatientAccess(locale);
  const t = await getTranslations("HealthWeb");
  const r = await getTranslations("Reports");
  const rs = await getTranslations("RouteState");
  const back = `/${locale}/health/records?tab=reports`;
  const response = await callPatientApi(`/medical-reports/${encodeURIComponent(reportId)}`, {}, token).catch(() => null);
  if (response?.status === 401) redirect(`/${locale}/login`);
  if (response?.status === 404 || response?.status === 403) notFound();
  const raw = response?.ok ? await response.json().catch(() => null) : null;
  const row = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : null;
  if (!row) {
    return (
      <ConsultPage locale={locale} title={t("reportTitle")} backHref={back}>
        <ConsultState kind="error" title={r("error")} body={t("unavailable")} retryLabel={rs("retry")} />
      </ConsultPage>
    );
  }
  const text = (value: unknown) => (typeof value === "string" && value.trim() ? value : undefined);
  const title = (locale === "ar" ? text(row.title_ar) : text(row.title_en)) ?? text(row.title_ar) ?? text(row.title_en) ?? text(row.title) ?? text(row.report_type) ?? reportId;
  const issued = formatDate(locale, text(row.issued_at) ?? text(row.createdAt), { dateStyle: "full" });
  const body = text(row.body);

  return (
    <ConsultPage locale={locale} title={t("reportTitle")} backHref={back}>
      <Hero icon="file-text" tone="teal" title={title} sub={issued ?? undefined} />
      {FIELDS.flatMap((key) => {
        const value = text(row[key]);
        return value ? [(
          <SectionCard key={key} id={`report-${key}`} title={r(`fields.${key}`)}>
            <p className={styles.body}>{value}</p>
          </SectionCard>
        )] : [];
      })}
      {body ? (
        <SectionCard id="report-body" title={r("fields.body")}>
          <p className={styles.body}>{body}</p>
        </SectionCard>
      ) : null}
    </ConsultPage>
  );
}
