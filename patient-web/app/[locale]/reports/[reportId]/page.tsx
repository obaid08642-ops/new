import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";

type Props = { params: Promise<{ locale: string; reportId: string }> };

export default async function ReportDetailPage({ params }: Props) {
  const { locale, reportId } = await params;
  if (!isLocale(locale) || !/^[A-Za-z0-9-]{8,64}$/.test(reportId)) notFound();
  setRequestLocale(locale);
  const token = await requirePatientAccess(locale);
  const t = await getTranslations("Reports");
  const response = await callPatientApi(`/medical-reports/${encodeURIComponent(reportId)}`, {}, token);
  if (response.status === 404 || response.status === 403) notFound();
  const isAr = locale === "ar";
  const raw = response.ok ? await response.json().catch(() => null) : null;
  const r = raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Record<string, unknown> : null;
  if (!r) return <main className="main" style={{ padding: "24px 16px", maxWidth: 760, margin: "0 auto" }}><p role="alert">{t("error")}</p></main>;
  const title = String((isAr ? r.title_ar : r.title_en) ?? r.title_ar ?? r.title_en ?? r.title ?? r.report_type ?? reportId);
  const issuedAt = typeof r.issued_at === "string" ? r.issued_at : typeof r.createdAt === "string" ? r.createdAt : null;
  const fields: Array<[string, unknown]> = [
    ["summary", r.summary], ["diagnosis", r.diagnosis], ["recommendations", r.recommendations],
    ["doctor_name", r.doctor_name], ["facility_name", r.facility_name],
  ];
  return <main className="main" style={{ padding: "24px 16px", maxWidth: 760, margin: "0 auto" }}>
    <p><Link href={`/${locale}/reports`} style={{ color: "var(--primary, #0d6e56)" }}>{t("back")}</Link></p>
    <h1>{title}</h1>
    {issuedAt ? <p style={{ opacity: 0.7 }}>{new Intl.DateTimeFormat(locale, { dateStyle: "full" }).format(new Date(issuedAt))}</p> : null}
    <dl style={{ display: "grid", gap: 12 }}>
      {fields.flatMap(([key, value]) => typeof value === "string" && value.trim() ? [(
        <div key={key} style={{ border: "1px solid var(--border, #e2e7ee)", borderRadius: 12, padding: "12px 16px" }}>
          <dt style={{ fontSize: 13, opacity: 0.7 }}>{t(`fields.${key}`)}</dt>
          <dd style={{ margin: 0, marginTop: 4, whiteSpace: "pre-wrap" }}>{value}</dd>
        </div>
      )] : [])}
    </dl>
    {typeof r.body === "string" && r.body.trim() ? (
      <section style={{ marginTop: 12 }}>
        <h2>{t("fields.body")}</h2>
        <p style={{ whiteSpace: "pre-wrap" }}>{r.body}</p>
      </section>
    ) : null}
  </main>;
}
