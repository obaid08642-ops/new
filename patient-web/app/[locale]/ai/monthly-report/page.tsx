import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { ActionLinks } from "@/components-next/consult/consult-parts";
import { CareHero, RecordRow } from "@/components-next/care/care-kit";
import { RowsCard, SectionHead, VitalTile } from "@/components-next/health/health-kit";
import health from "@/components-next/health/health.module.css";

type Props = { params: Promise<{ locale: string }> };

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}
function pickName(o: Record<string, unknown>, locale: string): string {
  const rtl = locale === "ar" || locale === "ur";
  const ar = typeof o.name_ar === "string" && o.name_ar ? o.name_ar : null;
  const en = typeof o.name === "string" && o.name ? o.name : null;
  return (rtl ? ar || en : en || ar) ?? (typeof o.type === "string" ? o.type : "");
}
function apptStart(a: Record<string, unknown>): number {
  for (const k of ["slot_start", "slotStart", "scheduled_at", "start"]) {
    const v = a[k];
    if (typeof v === "string" && Number.isFinite(Date.parse(v))) return Date.parse(v);
  }
  return NaN;
}

/**
 * The monthly report (merge map section 4: kept as its own screen; canvas/CareHub on the list/report template): this month's
 * appointments, the latest vitals, the chronic medicines and the trends, each from the endpoint it already read
 * (GET /care/appointments, /health/vitals/summary, /health/chronic-meds, /health/trends). Real data only.
 */
export default async function AiMonthlyReportPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("MonthlyReportWeb");
  const rs = await getTranslations("RouteState");
  const token = await requirePatientAccess(locale);
  const now = new Date();
  const frame = (body: ReactNode) => (
    <ConsultPage locale={locale} title={t("title")} backHref={`/${locale}/ai`}>
      {body}
    </ConsultPage>
  );
  const [apptsRes, vitalsRes, medsRes, trendsRes] = await Promise.all([
    callPatientApi("/care/appointments", {}, token),
    callPatientApi("/health/vitals/summary", {}, token),
    callPatientApi("/health/chronic-meds", {}, token),
    callPatientApi("/health/trends", {}, token),
  ]);
  if ([apptsRes, vitalsRes, medsRes, trendsRes].every((r) => r.status === 401)) redirect(`/${locale}/login`);
  if ([apptsRes, vitalsRes, medsRes, trendsRes].every((r) => !r.ok)) {
    return frame(<ConsultState kind="error" title={t("unavailableTitle")} body={t("unavailable")} retryLabel={rs("retry")} />);
  }
  const listOf = async (res: Response): Promise<Record<string, unknown>[]> => {
    if (!res.ok) return [];
    const p = asRecord(await res.json().catch(() => null));
    const l = [p?.data, p?.items, p?.results, p?.vitals, p?.trends].find(Array.isArray);
    return (Array.isArray(l) ? l : []).map(asRecord).filter((r): r is Record<string, unknown> => !!r);
  };
  const appts = (await listOf(apptsRes)).filter((a) => {
    const start = apptStart(a);
    if (!Number.isFinite(start)) return false;
    const d = new Date(start);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const isDone = (a: Record<string, unknown>) => ["COMPLETED", "completed"].includes(String(a.state ?? a.status ?? ""));
  const completed = appts.filter(isDone);
  const upcoming = appts.filter((a) => {
    const start = apptStart(a);
    return Number.isFinite(start) && start > Date.now() && !["CANCELLED", "cancelled"].includes(String(a.state ?? a.status ?? ""));
  });
  const vitals = await listOf(vitalsRes);
  const meds = await listOf(medsRes);
  const trends = (await listOf(trendsRes)).filter((row) => Array.isArray(row.data) && row.data.length > 0);
  const hasAny = appts.length > 0 || vitals.length > 0 || meds.length > 0 || trends.length > 0;
  const month = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(now);
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  const dash = t("notAvailable");
  const when = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });

  if (!hasAny) {
    return frame(
      <>
        <CareHero tone="mint" icon="chart-line-up" label={t("title")} title={month} lines={[t("heroLine")]} />
        <ConsultState kind="empty" icon="chart-line-up" tone="mint" title={t("emptyTitle")} body={t("emptyBody")} actionLabel={t("logReading")} actionHref={`/${locale}/health/vitals/log`} />
      </>,
    );
  }

  return frame(
    <>
      <CareHero tone="mint" icon="chart-line-up" label={t("title")} title={month} lines={[t("heroLine")]} />
      <ul className={health.tiles} aria-label={t("glance")}>
        <li><VitalTile label={t("appointments")} value={number.format(appts.length)} icon="stethoscope" tone="blue" /></li>
        <li><VitalTile label={t("completed")} value={number.format(completed.length)} icon="check-circle" tone="mint" /></li>
        <li><VitalTile label={t("upcoming")} value={number.format(upcoming.length)} icon="calendar-dots" tone="amber" /></li>
        <li><VitalTile label={t("chronicMeds")} value={number.format(meds.length)} icon="pill" tone="coral" /></li>
      </ul>

      {vitals.length > 0 ? (
        <section aria-labelledby="mr-vitals">
          <SectionHead id="mr-vitals" title={t("vitals")} action={{ href: `/${locale}/health/vitals/log`, label: t("logReading") }} />
          <RowsCard label={t("vitals")}>
            {vitals.slice(0, 8).map((v, index) => (
              <li key={index}>
                <RecordRow
                  icon="heartbeat"
                  tone="coral"
                  title={pickName(v, locale) || dash}
                  end={<bdi>{`${String(v.value ?? v.latest ?? dash)}${typeof v.unit === "string" ? ` ${v.unit}` : ""}`}</bdi>}
                />
              </li>
            ))}
          </RowsCard>
        </section>
      ) : null}

      {trends.length > 0 ? (
        <section aria-labelledby="mr-trends">
          <SectionHead id="mr-trends" title={t("trends")} action={{ href: `/${locale}/health/trends`, label: t("viewTrends") }} />
          <RowsCard label={t("trends")}>
            {trends.map((row, index) => {
              const pts = (row.data as unknown[]).map((p) => asRecord(p)).filter((p): p is Record<string, unknown> => !!p);
              const num = (p: Record<string, unknown> | undefined) => Number(p?.value ?? p?.y ?? NaN);
              const first = num(pts[0]);
              const last = num(pts[pts.length - 1]);
              const direction = !Number.isFinite(first) || !Number.isFinite(last) || last === first ? "stable" : last > first ? "rising" : "falling";
              const unit = typeof row.unit === "string" ? ` ${row.unit}` : "";
              return (
                <li key={index}>
                  <RecordRow
                    icon="chart-line-up"
                    tone="mint"
                    title={pickName(row, locale) || dash}
                    sub={[
                      t("readings", { count: pts.length }),
                      t("firstLast", { first: Number.isFinite(first) ? `${number.format(first)}${unit}` : dash, last: Number.isFinite(last) ? `${number.format(last)}${unit}` : dash }),
                    ]}
                    end={t(`direction.${direction}`)}
                  />
                </li>
              );
            })}
          </RowsCard>
        </section>
      ) : null}

      {appts.length > 0 ? (
        <section aria-labelledby="mr-appts">
          <SectionHead id="mr-appts" title={t("monthAppointments")} />
          <RowsCard label={t("monthAppointments")}>
            {appts.map((a, index) => {
              const start = apptStart(a);
              const title =
                typeof a.doctor_name === "string" && a.doctor_name ? a.doctor_name : typeof a.specialty === "string" && a.specialty ? a.specialty : t("appointment");
              return (
                <li key={typeof a.id === "string" ? a.id : index}>
                  <RecordRow
                    icon="stethoscope"
                    tone="blue"
                    title={title}
                    sub={[isDone(a) ? t("done") : t("scheduled"), Number.isFinite(start) ? when.format(new Date(start)) : ""].filter(Boolean)}
                  />
                </li>
              );
            })}
          </RowsCard>
        </section>
      ) : null}

      <ActionLinks actions={[{ href: `/${locale}/consultations`, label: t("bookFollowUp") }]} />
    </>,
  );
}
