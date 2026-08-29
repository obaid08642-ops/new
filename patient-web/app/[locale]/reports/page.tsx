import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";

type Props = { params: Promise<{ locale: string }> };

type ReportItem = { id: string; title: string; type?: string; issuedAt?: string; summary?: string };

function extractReports(payload: unknown, locale: string): ReportItem[] {
  const root = payload && typeof payload === "object" && !Array.isArray(payload) ? payload as Record<string, unknown> : null;
  const values = Array.isArray(payload) ? payload : [root?.data, root?.reports, root?.items].find(Array.isArray);
  if (!Array.isArray(values)) return [];
  const isAr = locale === "ar";
  return values.flatMap((value) => {
    const r = value && typeof value === "object" ? value as Record<string, unknown> : null;
    if (!r || !r.id) return [];
    const title = String((isAr ? r.title_ar : r.title_en) ?? r.title_ar ?? r.title_en ?? r.title ?? r.report_type ?? "");
    return [{
      id: String(r.id),
      title: title || String(r.id),
      type: typeof r.report_type === "string" ? r.report_type : undefined,
      issuedAt: typeof r.issued_at === "string" ? r.issued_at : typeof r.createdAt === "string" ? r.createdAt : undefined,
      summary: typeof r.summary === "string" ? r.summary : undefined,
    }];
  });
}

export default async function ReportsPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const token = await requirePatientAccess(locale);
  const t = await getTranslations("Reports");
  const response = await callPatientApi("/medical-reports/mine", {}, token);
  const reports = response.ok ? extractReports(await response.json().catch(() => null), locale) : [];
  return <main className="main" style={{ padding: "24px 16px", maxWidth: 760, margin: "0 auto" }}>
    <h1>{t("title")}</h1>
    {!response.ok ? <p role="alert">{t("error")}</p> : reports.length === 0 ? <p style={{ opacity: 0.7 }}>{t("empty")}</p> : (
      <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 10 }}>
        {reports.map((report) => (
          <li key={report.id}>
            <Link href={`/${locale}/reports/${report.id}`} style={{ display: "block", border: "1px solid var(--border, #e2e7ee)", borderRadius: 12, padding: "14px 16px", textDecoration: "none", color: "inherit" }}>
              <strong>{report.title}</strong>
              <div style={{ fontSize: 13, opacity: 0.7, marginTop: 4 }}>
                {[report.type, report.issuedAt ? new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(report.issuedAt)) : null].filter(Boolean).join(" · ")}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    )}
  </main>;
}
