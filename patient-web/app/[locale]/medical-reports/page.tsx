import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { callPatientApi } from "@/lib/api/upstream";
import { isLocale } from "@/lib/i18n";
import { formatDate } from "@/lib/format-date";
import { readReportList } from "@/lib/medical-reports/rest";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { RowCard } from "@/components-next/consult/consult-parts";

type Props = { params: Promise<{ locale: string }> };

/** PT-08: "تقرير طبي / Medical report": the patient's reports with a recommended rest period, newest first. GET /care/sick-leaves (the route keeps its old name). */
export default async function MedicalReportsPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("MedicalReport");
  const token = await requirePatientAccess(locale);
  const response = await callPatientApi("/care/sick-leaves", { cache: "no-store" }, token);
  if (response.status === 401) redirect(`/${locale}/login`);
  const backHref = `/${locale}/dashboard`;
  if (!response.ok) {
    return (
      <ConsultPage locale={locale} title={t("listTitle")} backHref={backHref}>
        <ConsultState kind="error" title={t("loadError")} retryLabel={t("retry")} />
      </ConsultPage>
    );
  }
  const rows = readReportList(await response.json().catch(() => null));
  return (
    <ConsultPage locale={locale} title={t("listTitle")} backHref={backHref}>
      {rows.length === 0 ? <ConsultState kind="empty" title={t("listEmpty")} body={t("listEmptyBody")} /> : (
        <div>
          {rows.map((row) => {
            const from = formatDate(locale, row.from);
            const to = formatDate(locale, row.to);
            const period = from && to ? `${from} – ${to}${row.days ? ` · ${t("daysCount", { n: row.days })}` : ""}` : null;
            const seha = row.seha.status === "registered" ? t("sehaRegistered", { number: row.seha.number ?? "" }) : t("sehaPending");
            return (
              <RowCard
                key={row.id}
                href={`/${locale}/medical-reports/${encodeURIComponent(row.id)}`}
                title={row.serial ?? t("detailTitle")}
                sub={[period, row.doctorName, row.revoked ? t("revoked") : seha].filter(Boolean).join(" · ")}
              />
            );
          })}
        </div>
      )}
    </ConsultPage>
  );
}
