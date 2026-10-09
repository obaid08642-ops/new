import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { extractDiagnosticBookings } from "@/lib/api/diagnostics";
import { callPatientApi } from "@/lib/api/upstream";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { RowCard } from "@/components-next/consult/consult-parts";
import { LAB, RADIOLOGY, pickText } from "@/components-next/diagnostics/diag-parts";
import { diagStatus } from "@/components-next/diagnostics/status";
import { Icon } from "@/components-next/ui-generated/src/Icon";
import consult from "@/components-next/consult/consult.module.css";
import styles from "@/components-next/diagnostics/diag.module.css";
import { diagnosticBookingHref } from "@/lib/diagnostics-links";

type Props = { params: Promise<{ locale: string }> };

function rowsOf(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const data = (payload as { data?: unknown } | null)?.data;
  return Array.isArray(data) ? data : [];
}

/** The patient's results (canvas/ServiceHub "نتائجي"): the lab bookings, with the ones whose report is ready first, and the radiology reports, each as the server sent it. */
export default async function DiagnosticsResultsPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("DiagWeb");
  const d = await getTranslations("Diagnostics");
  const token = await requirePatientAccess(locale);
  const [labsRes, radioRes] = await Promise.all([callPatientApi("/labs/bookings/mine", {}, token), callPatientApi("/radiology/reports/mine", {}, token)]);
  if (labsRes.status === 401 || radioRes.status === 401) redirect(`/${locale}/login`);
  const backHref = `/${locale}/diagnostics`;
  if (!labsRes.ok && !radioRes.ok) {
    return (
      <ConsultPage locale={locale} title={t("resultsTitle")} backHref={backHref}>
        <ConsultState kind="error" title={t("resultsErrorTitle")} body={d("unavailable")} retryLabel={t("retry")} actionLabel={t("backToHub")} actionHref={backHref} />
      </ConsultPage>
    );
  }
  const labs = labsRes.ok ? extractDiagnosticBookings(await labsRes.json().catch(() => null)) : [];
  const reports = radioRes.ok ? rowsOf(await radioRes.json().catch(() => null)) : [];
  const ordered = [...labs.filter((b) => b.hasReport), ...labs.filter((b) => !b.hasReport)];
  const caret = <Icon name={locale === "ar" || locale === "ur" ? "caret-left" : "caret-right"} size={20} tone="currentColor" />;

  return (
    <ConsultPage locale={locale} title={t("resultsTitle")} backHref={backHref}>
      <section className={styles.stack} aria-labelledby="results-labs">
        <h2 id="results-labs" className={styles.sectionTitle}>{t("resultsLabs")}</h2>
        {ordered.length === 0 ? (
          <ConsultState kind="empty" icon="test-tube" tone={LAB.tone} title={t("resultsLabsEmptyTitle")} body={t("resultsLabsEmptyBody")} />
        ) : (
          <ul className={consult.list}>
            {ordered.map((b) => {
              const status = diagStatus(b.state);
              return (
                <li key={b.id}>
                  <RowCard href={diagnosticBookingHref(locale, "labs", b.id)} icon={LAB.icon} tone={LAB.tone} title={pickText(locale, b.testNameAr, b.testNameEn) ?? d("labs.label")} sub={[b.scheduledAt && !Number.isNaN(Date.parse(b.scheduledAt)) ? new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(b.scheduledAt)) : null, b.hasReport ? d("reportReady") : status.key === "unknown" ? d("statusUnavailable") : t(`status_${status.key}`)].filter(Boolean).join(" · ")} caret={caret} />
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <section className={styles.stack} aria-labelledby="results-radiology">
        <h2 id="results-radiology" className={styles.sectionTitle}>{t("resultsRadiology")}</h2>
        {reports.length === 0 ? (
          <ConsultState kind="empty" icon="scan" tone={RADIOLOGY.tone} title={t("resultsRadiologyEmptyTitle")} body={t("resultsRadiologyEmptyBody")} />
        ) : (
          <ul className={consult.list}>
            {reports.map((item, i) => {
              const r = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
              const title = [r.title, r.service_name].find((v): v is string => typeof v === "string" && v.trim().length > 0);
              return (
                <li key={typeof r.id === "string" ? r.id : i}>
                  <RowCard icon={RADIOLOGY.icon} tone={RADIOLOGY.tone} title={title ?? t("radiologyReport")} />
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </ConsultPage>
  );
}
