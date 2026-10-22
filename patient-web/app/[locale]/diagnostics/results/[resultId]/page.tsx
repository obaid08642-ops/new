import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { formatDate } from "@/lib/format-date";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";
import { trendFor, type TrendPoint } from "@/lib/diagnostics/result-trend";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { Facts, Hero, SectionCard, type FactRow } from "@/components-next/consult/consult-parts";
import { ButtonLink } from "@/components-next/pharmacy/button-link";
import { StatusChip } from "@/components-next/ui-generated/components/Controls";
import { DIAG_TONES } from "@/components-next/diagnostics/tones";
import styles from "@/components-next/consult/consult.module.css";

type Props = { params: Promise<{ locale: string; resultId: string }> };
type Entry = { name?: unknown; value?: unknown; unit?: unknown; ref_low?: unknown; ref_high?: unknown; range?: unknown; flag?: unknown };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "LabResult" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

const text = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : typeof value === "number" && Number.isFinite(value) ? String(value) : undefined);
const FLAGS = ["normal", "high", "low", "critical"] as const;

/**
 * Decision 19 (issue 338): one lab result, opened from its "result ready" notification (route /health/results/:id).
 * GET /lab-results/:id answers the patient's own result: each value with its unit, the reference range and the server's
 * flag, and what the lab wrote. "Discuss the result with a doctor" opens the doctors list. A report file the lab uploaded
 * on the booking (the older path) is opened from the booking page.
 */
export default async function LabResultPage({ params }: Props) {
  const { locale, resultId } = await params;
  if (!isLocale(locale) || !/^[A-Za-z0-9-]{8,64}$/.test(resultId)) notFound();
  setRequestLocale(locale);
  const token = await requirePatientAccess(locale);
  const t = await getTranslations("LabResult");
  const back = `/${locale}/diagnostics/results`;
  // Ord11: the same test's earlier values come from the patient's own list (GET /lab-results/mine); a failed read only hides the trend.
  const [response, history] = await Promise.all([
    callPatientApi(`/lab-results/${encodeURIComponent(resultId)}`, { cache: "no-store" }, token).catch(() => null),
    callPatientApi("/lab-results/mine", { cache: "no-store" }, token).then((r) => (r.ok ? r.json().catch(() => null) : null)).catch(() => null),
  ]);
  if (response?.status === 401) redirect(`/${locale}/login`);
  if (response?.status === 404 || response?.status === 403) notFound();
  const raw = response?.ok ? await response.json().catch(() => null) : null;
  const row = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : null;
  if (!row) {
    return (
      <ConsultPage locale={locale} title={t("title")} backHref={back}>
        <ConsultState kind="error" title={t("error")} body={t("errorBody")} retryLabel={t("retry")} />
      </ConsultPage>
    );
  }
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? new Intl.NumberFormat(locale).format(v) : undefined);
  const name = (locale === "ar" || locale === "ur" ? text(row.service_name_ar) ?? text(row.service_name_en) : text(row.service_name_en) ?? text(row.service_name_ar)) ?? text(row.name) ?? t("title");
  const issued = formatDate(locale, text(row.reported_at) ?? text(row.uploaded_at), { dateStyle: "full" });
  const entries = (Array.isArray(row.entries) ? (row.entries as Entry[]) : []).filter((e) => text(e?.name));
  const rows: FactRow[] = entries.map((e) => {
    const flag = FLAGS.find((f) => f === e.flag);
    const low = num(e.ref_low);
    const high = num(e.ref_high);
    const value = [text(e.value), text(e.unit)].filter(Boolean).join(" ");
    return {
      label: text(e.name) as string,
      value: (
        <span className={styles.body}>
          {value}
          {low && high ? <span className={styles.muted}>{` · ${t("range", { low, high })}`}</span> : text(e.range) ? <span className={styles.muted}>{` · ${t("rangeText", { range: text(e.range) as string })}`}</span> : null}
          {flag && flag !== "normal" ? <> <StatusChip label={t(`flag_${flag}`)} tone={flag === "critical" ? DIAG_TONES.critical : DIAG_TONES.warn} /></> : null}
        </span>
      ),
    };
  });
  const trends = new Map<string, TrendPoint[]>();
  for (const e of entries) {
    const name = text(e.name);
    if (!name || trends.has(name)) continue;
    const points = trendFor(history, name).filter((point) => point.id !== text(row.id));
    const current = typeof e.value === "number" || (typeof e.value === "string" && e.value.trim() !== "") ? Number(e.value) : NaN;
    if (points.length > 0 && Number.isFinite(current)) {
      trends.set(name, [...points, { id: text(row.id) ?? resultId, at: text(row.reported_at) ?? "", value: current, unit: text(e.unit), flag: typeof e.flag === "string" ? e.flag : undefined }]);
    }
  }
  const trendSections = [...trends].map(([name, points]) => (
    <SectionCard key={`trend-${name}`} id={`lab-result-trend-${name}`} title={`${t("trendTitle")} · ${name}`}>
      <p className={styles.muted}>{t("trendNote")}</p>
      <ol className={styles.body}>
        {points.map((point) => (
          <li key={point.id}>
            {`${formatDate(locale, point.at, { dateStyle: "medium" }) ?? point.at} · ${new Intl.NumberFormat(locale).format(point.value)}${point.unit ? ` ${point.unit}` : ""}`}
          </li>
        ))}
      </ol>
    </SectionCard>
  ));
  const sections = (["findings", "impression", "recommendations", "notes"] as const).flatMap((key) => {
    const value = text(row[key]);
    return value ? [(
      <SectionCard key={key} id={`lab-result-${key}`} title={t(key)}>
        <p className={styles.body}>{value}</p>
      </SectionCard>
    )] : [];
  });
  const bookingId = text(row.booking_id);

  return (
    <ConsultPage locale={locale} title={t("title")} backHref={back}>
      <Hero icon="test-tube" tone={DIAG_TONES.lab} title={name} sub={issued ?? undefined}>
        {row.critical === true ? <StatusChip label={t("critical")} tone={DIAG_TONES.critical} /> : null}
      </Hero>
      {rows.length > 0 ? (
        <SectionCard id="lab-result-values" title={t("values")}>
          <Facts rows={rows} label={t("values")} />
        </SectionCard>
      ) : null}
      {trendSections}
      {sections}
      {row.source === "lab_booking" && bookingId ? (
        <ButtonLink href={`/${locale}/diagnostics/bookings/labs/${encodeURIComponent(bookingId)}`} label={t("openBooking")} variant="outline" fullWidth />
      ) : rows.length === 0 && sections.length === 0 ? (
        <p className={`${styles.body} ${styles.muted}`}>{t("empty")}</p>
      ) : null}
      <ButtonLink href={`/${locale}/consultations/doctors`} label={t("discuss")} fullWidth />
    </ConsultPage>
  );
}
