import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { extractVitalHistory, extractVitalSummary } from "@/lib/api/vitals";
import { getPatientVitalHistory, getPatientVitalSummary } from "@/lib/api/vitals-server";
import { parseHealthTrends } from "@/lib/api/trends";
import { getPatientHealthTrends } from "@/lib/api/trends-server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { BOARD_VITALS, VITAL_ORDER, VITAL_VIEW, isFlag, pickTab, vitalView, type VitalKey } from "@/lib/health/view";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { LocalTimeLine } from "@/components-next/consult/local-time-line";
import { Notice } from "@/components-next/consult/consult-parts";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import { FormSheet } from "@/components-next/health/form-sheet";
import { HealthTabs, RowsCard, VitalTile } from "@/components-next/health/health-kit";
import { VitalsForm } from "@/components-next/health/vitals-form";
import styles from "@/components-next/health/health.module.css";
import forms from "@/components-next/consult/consult.module.css";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ tab?: string | string[]; add?: string | string[] }> };
const TABS = ["today", "history", "trends"] as const;

/**
 * Vitals (merge map, section 1): three tabs on one screen, `?tab=today|history|trends`. Today is the latest reading of each
 * vital (GET /health/vitals/summary), History every saved reading (GET /health/vitals), Trends the direction of each
 * (GET /health/trends). "Add reading" is a sheet on the screen (the old log form, POST /api/health/vitals), and `?add=1` opens it.
 */
export default async function VitalsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const query = await searchParams;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("HealthWeb");
  const rs = await getTranslations("RouteState");
  const token = await requirePatientAccess(locale);
  const tab = pickTab(query.tab, TABS, "today");
  const base = `/${locale}/health/vitals`;

  const frame = (body: ReactNode) => (
    <ConsultPage locale={locale} title={t("vitalsTitle")} backHref={`/${locale}/health`}>
      <div className={styles.toolbar}>
        <span />
        <FormSheet title={t("addReading")} triggerLabel={t("addReading")} closeLabel={t("close")} defaultOpen={isFlag(query.add)} closeHref={`${base}?tab=${tab}`}>
          <VitalsForm />
        </FormSheet>
      </div>
      <HealthTabs label={t("vitalsTitle")} base={base} active={tab} options={[
        { value: "today", label: t("vitalsToday") },
        { value: "history", label: t("vitalsHistory") },
        { value: "trends", label: t("vitalsTrends") },
      ]} />
      {body}
    </ConsultPage>
  );
  const failed = frame(<ConsultState kind="error" title={t("unavailableTitle")} body={t("unavailable")} retryLabel={rs("retry")} />);

  let response: Response;
  try {
    response = await (tab === "today" ? getPatientVitalSummary(token) : tab === "history" ? getPatientVitalHistory(token) : getPatientHealthTrends(token));
  } catch {
    return failed;
  }
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  if (!response.ok) return failed;
  const payload = await response.json().catch(() => null);
  const label = (key: VitalKey) => t(`vital.${key}`);

  if (tab === "today") {
    const latest = new Map(extractVitalSummary(payload).map((vital) => [vital.key, vital]));
    const shown = VITAL_ORDER.filter((key) => BOARD_VITALS.includes(key) || latest.has(key));
    return frame(
      <>
        <ul className={styles.tiles} aria-label={t("vitalsToday")}>
          {shown.map((key) => {
            const vital = latest.get(key);
            return (
              <li key={key}>
                <VitalTile
                  label={label(key)}
                  value={vital ? vital.value : "—"}
                  unit={vital?.unit}
                  when={vital?.measuredAt ? <>{t("lastMeasured")} <LocalTimeLine iso={vital.measuredAt} locale={locale} /></> : t("noReading")}
                  icon={VITAL_VIEW[key].icon}
                  tone={VITAL_VIEW[key].tone}
                />
              </li>
            );
          })}
        </ul>
        <Notice>{t("notice")}</Notice>
      </>,
    );
  }

  if (tab === "history") {
    const readings = extractVitalHistory(payload);
    if (readings.length === 0) return frame(<ConsultState kind="empty" icon="heartbeat" title={t("vitalsHistory")} body={t("historyEmpty")} />);
    return frame(
      <>
        <RowsCard label={t("vitalsHistory")}>
          {readings.map((reading) => (
            <li key={reading.id}>
              <div className={styles.row}>
                <FIcon icon={VITAL_VIEW[reading.key].icon} tone={VITAL_VIEW[reading.key].tone} size={40} />
                <span className={styles.rowBody}>
                  <span className={styles.rowTitle}>{label(reading.key)} · <bdi>{reading.value}{reading.unit ? ` ${reading.unit}` : ""}</bdi></span>
                  {reading.context ? <span className={styles.rowSub}>{reading.context}</span> : null}
                  {reading.measuredAt ? <span className={styles.rowSub}><LocalTimeLine iso={reading.measuredAt} locale={locale} /></span> : null}
                </span>
              </div>
            </li>
          ))}
        </RowsCard>
        <Notice>{t("notice")}</Notice>
      </>,
    );
  }

  const trends = parseHealthTrends(payload);
  if (trends.length === 0) return frame(<ConsultState kind="empty" icon="chart-line-up" title={t("vitalsTrends")} body={t("trendsEmpty")} />);
  return frame(
    <>
      <ul className={forms.list} aria-label={t("vitalsTrends")}>
        {trends.map((trend) => {
          const Direction = trend.trendDir === "up" ? TrendingUp : trend.trendDir === "down" ? TrendingDown : Minus;
          return (
            <li key={trend.id} className={forms.rowCard}>
              <FIcon icon={vitalView(trend.id).icon} tone={vitalView(trend.id).tone} size={44} />
              <span className={forms.rowBody}>
                <span className={forms.rowTitle}>{trend.name}</span>
                <span className={forms.rowSub}><bdi>{trend.current} {trend.unit}</bdi> · {t(`direction.${trend.trendDir}`)} · {t("readingsCount", { count: trend.data.length })}</span>
                {trend.labels.length ? <span className={forms.rowSub}><bdi>{trend.labels.slice(-5).join(" · ")}</bdi></span> : null}
              </span>
              <span className={forms.rowEndIcon}><Direction size={20} aria-hidden="true" /></span>
            </li>
          );
        })}
      </ul>
      <Notice>{t("trendsNotice")}</Notice>
    </>,
  );
}
