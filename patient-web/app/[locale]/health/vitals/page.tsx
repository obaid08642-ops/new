import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { extractVitalHistory, extractVitalSummary } from "@/lib/api/vitals";
import { getPatientVitalHistory, getPatientVitalSummary } from "@/lib/api/vitals-server";
import { parseHealthTrends } from "@/lib/api/trends";
import { getPatientHealthTrends } from "@/lib/api/trends-server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { BOARD_VITALS, VITAL_ORDER, VITAL_VIEW, inNormalRange, isFlag, pickTab, seriesStats, vitalView, type VitalKey } from "@/lib/health/view";
import { formatDate } from "@/lib/format-date";
import { ShareButton } from "@/components-next/health/share-button";
import { TrendChart } from "@/components-next/health/trend-chart";
import rx from "@/components-next/pharmacy/rx.module.css";
import { LinkSegmented } from "@/components-next/consult/link-segmented";
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

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ tab?: string | string[]; add?: string | string[]; vital?: string | string[] }> };
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
  const vitalParam = Array.isArray(query.vital) ? query.vital[0] : query.vital;

  const frame = (body: ReactNode) => (
    <ConsultPage locale={locale} title={t("vitalsTitle")} backHref={`/${locale}/health`}>
      <div className={styles.toolbar}>
        <span />
        <FormSheet title={t("addReading")} triggerLabel={t("addReading")} closeLabel={t("close")} defaultOpen={isFlag(query.add)} closeHref={`${base}?tab=${tab}`}>
          <VitalsForm defaultType={vitalParam} />
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
                  href={`${base}?tab=history&vital=${key}`}
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
    const everything = extractVitalHistory(payload);
    if (everything.length === 0) return frame(<ConsultState kind="empty" icon="heartbeat" title={t("vitalsHistory")} body={t("historyEmpty")} />);
    // chips per vital type (as in the app); the last 30 readings of the chosen type
    const present = VITAL_ORDER.filter((key) => everything.some((reading) => reading.key === key));
    const chosen = present.find((key) => key === vitalParam) ?? "all";
    const readings = (chosen === "all" ? everything : everything.filter((reading) => reading.key === chosen)).slice(0, 30);
    const contextLabel = (value: string) => (value === "morning" || value === "afternoon" || value === "evening" ? t(`ctx.${value}`) : value);
    return frame(
      <>
        <LinkSegmented
          label={t("vitalsHistory")}
          value={chosen}
          options={[{ value: "all", label: t("historyAll"), href: `${base}?tab=history` }, ...present.map((key) => ({ value: key, label: label(key), href: `${base}?tab=history&vital=${key}` }))]}
        />
        <RowsCard label={t("vitalsHistory")}>
          {readings.map((reading) => (
            <li key={reading.id}>
              <div className={styles.row}>
                <FIcon icon={VITAL_VIEW[reading.key].icon} tone={VITAL_VIEW[reading.key].tone} size={40} />
                <span className={styles.rowBody}>
                  <span className={styles.rowTitle}>{label(reading.key)} · <bdi>{reading.value}{reading.unit ? ` ${reading.unit}` : ""}</bdi></span>
                  {reading.context ? <span className={styles.rowSub}>{contextLabel(reading.context)}</span> : null}
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

  const trends = parseHealthTrends(payload).filter((trend) => trend.data.length > 0);
  if (trends.length === 0) return frame(<ConsultState kind="empty" icon="chart-line-up" title={t("vitalsTrends")} body={t("trendsEmpty")} actionLabel={t("addReading")} actionHref={`${base}?tab=trends&add=1`} />);
  // one vital at a time (chips, as in the app): its chart, range and the highest / lowest / average / count tiles
  const trendLabel = (trend: (typeof trends)[number]) => (trend.id in VITAL_VIEW ? label(trend.id as VitalKey) : trend.name);
  const current = trends.find((trend) => trend.id === vitalParam) ?? trends[0];
  const values = current.data.map((point) => point.value);
  const stats = seriesStats(values);
  const inRange = inNormalRange(current.current, current.normal);
  const look = vitalView(current.id);
  const num = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  const shareText = [`${t("trendsShareTitle")} ${formatDate(locale, new Date().toISOString()) ?? ""}`.trim(), "", ...trends.map((trend) => `• ${trendLabel(trend)}: ${num.format(trend.current)} ${trend.unit}`)].join("\n");
  return frame(
    <>
      <LinkSegmented
        label={t("vitalsTrends")}
        value={current.id}
        options={trends.map((trend) => ({ value: trend.id, label: trendLabel(trend), href: `${base}?tab=trends&vital=${trend.id}` }))}
      />
      <section className={rx.card} aria-label={trendLabel(current)}>
        <div className={styles.sectionHead}>
          <p className={styles.scoreValue}><bdi>{num.format(current.current)}</bdi> <span className={styles.tileUnit}>{current.unit}</span></p>
          {inRange === null ? null : <span className={`${styles.pill} ${inRange ? styles.pill_success : styles.pill_warning}`}>{inRange ? t("trendsInRange") : t("trendsOutRange")}</span>}
        </div>
        {current.normal ? <p className={rx.cardLabel}>{t("trendsNormal", { lo: num.format(current.normal[0]), hi: num.format(current.normal[1]), unit: current.unit })}</p> : null}
        <TrendChart values={values} tone={look.tone} label={`${trendLabel(current)}: ${t("readingsCount", { count: values.length })}`} />
        <p className={rx.cardLabel}>{t(`direction.${current.trendDir}`)}</p>
      </section>
      {stats ? (
        <ul className={styles.tiles} aria-label={trendLabel(current)}>
          {([["trendsMax", num.format(stats.max), current.unit], ["trendsMin", num.format(stats.min), current.unit], ["trendsAvg", num.format(stats.avg), current.unit], ["trendsCount", num.format(stats.count), undefined]] as const).map(([key, value, unit]) => (
            <li key={key}><VitalTile label={t(key)} value={value} unit={unit} icon={look.icon} tone={look.tone} /></li>
          ))}
        </ul>
      ) : null}
      <ShareButton label={t("trendsShare")} copiedLabel={t("copied")} text={shareText} size="md" />
      <Notice>{t("trendsNotice")}</Notice>
    </>,
  );
}
