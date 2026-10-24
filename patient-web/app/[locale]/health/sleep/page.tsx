import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPatientSleepReadings } from "@/lib/api/sleep-server";
import { parseSleepReadings, type SleepReading } from "@/lib/api/sleep";
import { requirePatientAccess } from "@/lib/auth/session";
import { getPublicSleepArticles } from "@/lib/api/articles-server";
import { parseArticleList } from "@/lib/api/articles";
import { isFlag } from "@/lib/health/view";
import { sleepQuality, sleepWeek } from "@/lib/health/sleep";
import { isLocale } from "@/lib/i18n";
import { ArticleRows } from "@/components-next/articles/article-kit";
import { FormSheet } from "@/components-next/health/form-sheet";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { LocalTimeLine } from "@/components-next/consult/local-time-line";
import { Notice } from "@/components-next/consult/consult-parts";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import { RowsCard, SectionHead } from "@/components-next/health/health-kit";
import { SleepAddForm } from "@/components-next/health/sleep-add-form";
import rx from "@/components-next/pharmacy/rx.module.css";
import styles from "@/components-next/health/health.module.css";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ add?: string | string[] }> };

const when = (reading: SleepReading) => (reading.measuredAt ? new Date(reading.measuredAt).getTime() : 0);

/**
 * Sleep (merge map, section 1; restyled on the health template): the last night's score and hours as the lead card, then
 * every saved reading (GET /health/sleep), and the form to add a night (POST /health/sleep through the proxy, as the app does).
 */
export default async function SleepPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const query = await searchParams;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("HealthWeb");
  const rs = await getTranslations("RouteState");
  const token = await requirePatientAccess(locale);
  const ta = await getTranslations("Articles");
  const here = `/${locale}/health/sleep`;
  const frame = (body: ReactNode) => (
    <ConsultPage locale={locale} title={t("sleepTitle")} backHref={`/${locale}/health`}>
      <div className={styles.toolbar}>
        <span />
        <FormSheet title={t("sleepAdd")} triggerLabel={t("sleepAdd")} closeLabel={t("close")} defaultOpen={isFlag(query.add)} closeHref={here}>
          <SleepAddForm />
        </FormSheet>
      </div>
      {body}
    </ConsultPage>
  );

  let response: Response;
  try { response = await getPatientSleepReadings(token); } catch { response = new Response(null, { status: 503 }); }
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  if (!response.ok) return frame(<ConsultState kind="error" title={t("unavailableTitle")} body={t("unavailable")} retryLabel={rs("retry")} />);

  const readings = parseSleepReadings(await response.json().catch(() => null)).sort((a, b) => when(b) - when(a));
  // sleep tips: the published articles tagged "sleep" (decision B8); no tips, no section
  const tipsResponse = await getPublicSleepArticles();
  const tips = tipsResponse?.ok ? parseArticleList(await tipsResponse.json().catch(() => null)) : [];
  const tipsBlock = tips.length ? (
    <>
      <SectionHead id="sleep-tips" title={t("sleepTips")} />
      <ArticleRows locale={locale} articles={tips} label={t("sleepTips")} untitled={ta("untitled")} />
    </>
  ) : null;
  if (readings.length === 0) return frame(<><ConsultState kind="empty" icon="moon" title={t("sleepTitle")} body={t("sleepEmpty")} actionLabel={t("sleepAdd")} actionHref={`${here}?add=1`} />{tipsBlock}</>);
  const last = readings[0];
  const quality = sleepQuality(last.score);
  const week = sleepWeek(readings);
  const maxHours = Math.max(1, ...week.map((day) => day.hours));
  const average = week.length ? week.reduce((sum, day) => sum + day.hours, 0) / week.length : null;
  const num = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });

  return frame(
    <>
      <section className={rx.card} aria-labelledby="sleep-last">
        <div className={styles.score}>
          <FIcon icon="moon" tone="violet" size={52} />
          <div className={styles.scoreBody}>
            <h2 id="sleep-last" className={styles.sectionTitle}>{t("sleepLast")}</h2>
            {last.measuredAt ? <span className={rx.cardLabel}><LocalTimeLine iso={last.measuredAt} locale={locale} /></span> : null}
          </div>
          <p className={styles.scoreValue}>{last.score ?? "—"}</p>
        </div>
        {quality ? <span className={`${styles.pill} ${styles[`pill_${quality.tone}`]}`}>{t(`sleepQuality.${quality.key}`)}</span> : null}
        <ul className={styles.parts}>
          <li className={styles.part}><span className={rx.cardLabel}>{t("sleepScore")}</span><span className={styles.partValue}>{last.score ?? t("sleepNoScore")}</span></li>
          <li className={styles.part}><span className={rx.cardLabel}>{t("sleepDuration")}</span><span className={styles.partValue}>{last.durationHours !== undefined ? t("sleepHours", { hours: last.durationHours }) : "—"}</span></li>
        </ul>
      </section>
      {week.length ? (
        <>
          <SectionHead id="sleep-week" title={t("sleepWeek")} />
          <section className={rx.card} aria-labelledby="sleep-week">
            <ul className={styles.weekBars}>
              {week.map((day, index) => {
                const label = new Intl.DateTimeFormat(locale, { weekday: "short" }).format(day.date);
                return (
                  <li key={index} className={styles.weekCol} aria-label={`${label}: ${t("sleepHours", { hours: num.format(day.hours) })}`}>
                    <span className={styles.weekValue}><bdi>{num.format(day.hours)}</bdi></span>
                    <span className={styles.weekBar} style={{ blockSize: `${Math.max(6, (day.hours / maxHours) * 70)}%` }} aria-hidden="true" />
                    <span className={styles.weekDay}>{label}</span>
                  </li>
                );
              })}
            </ul>
            {average !== null ? <p className={rx.cardLabel}>{t("sleepAverage", { hours: num.format(average) })}</p> : null}
          </section>
        </>
      ) : null}
      <SectionHead id="sleep-log" title={t("sleepLog")} />
      <RowsCard label={t("sleepLog")}>
        {readings.map((reading, index) => (
          <li key={reading.id ?? index}>
            <div className={styles.row}>
              <FIcon icon="moon" tone="violet" size={40} />
              <span className={styles.rowBody}>
                <span className={styles.rowTitle}>{reading.score !== undefined ? t("sleepScoreValue", { score: reading.score }) : t("sleepNoScore")}</span>
                <span className={styles.rowSub}>
                  {reading.durationHours !== undefined ? t("sleepHours", { hours: reading.durationHours }) : null}
                  {reading.durationHours !== undefined && reading.measuredAt ? " · " : null}
                  {reading.measuredAt ? <LocalTimeLine iso={reading.measuredAt} locale={locale} /> : null}
                </span>
              </span>
            </div>
          </li>
        ))}
      </RowsCard>
      {tipsBlock}
      <Notice>{t("sleepNotice")}</Notice>
    </>,
  );
}
