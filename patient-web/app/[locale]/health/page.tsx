import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { extractVitalSummary } from "@/lib/api/vitals";
import { getPatientHealthScore, getPatientVitalSummary } from "@/lib/api/vitals-server";
import { parseHealthScore } from "@/lib/api/health-score";
import { extractMedicationReminderSummaries } from "@/lib/api/reminders";
import { getPatientMedicationReminders } from "@/lib/api/reminders-server";
import { getPatientDashboardUpcomingAppointment } from "@/lib/api/dashboard-server";
import { parseDashboardAppointment } from "@/lib/api/dashboard";
import { statusKey as appointmentStatusKey } from "@/lib/consult/appointment-view";
import { requirePatientAccess } from "@/lib/auth/session";
import { getDirection, isLocale } from "@/lib/i18n";
import { todayDoses } from "@/lib/health/doses";
import { BOARD_VITALS, VITAL_ORDER, VITAL_VIEW, CORAL, TEAL } from "@/lib/health/view";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { LocalTimeLine } from "@/components-next/consult/local-time-line";
import { Notice, RowCard } from "@/components-next/consult/consult-parts";
import { DoseRows } from "@/components-next/health/dose-rows";
import { ScoreRing } from "@/components-next/health/score-ring";
import { PartUnavailable, RowsCard, SectionHead, VitalTile } from "@/components-next/health/health-kit";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import { Icon } from "@/components-next/ui-generated/src/Icon";
import { SERVICE_ICONS } from "@/components-next/ui-generated/icons/fill";
import rx from "@/components-next/pharmacy/rx.module.css";
import styles from "@/components-next/health/health.module.css";

type Props = { params: Promise<{ locale: string }> };

/** F20: the wearables page is hidden until the device integration is real; the hub shows its row only when the page is on. */
const scoreTone = (status: string): "success" | "info" | "warning" | "danger" => (status === "excellent" ? "success" : status === "good" ? "info" : status === "fair" ? "warning" : "danger");
const wearablesOn = () => process.env.NEXT_PUBLIC_WEARABLES_ENABLED === "true";

/**
 * The health hub (canvas/HealthHub): the health ID button, the medical file, the score, the latest vitals, today's doses
 * and the way into every other health screen. It replaces the old shortcut grid and the stand-alone score page (merge map,
 * section 1: the score is a card here, one GET /health/score). The vitals summary is what the page needs; the score and
 * today's doses say so in place when they cannot load.
 */
export default async function HealthPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("HealthWeb");
  const rs = await getTranslations("RouteState");
  const token = await requirePatientAccess(locale);
  const unavailable = (
    <ConsultPage locale={locale} title={t("title")}>
      <ConsultState kind="error" title={t("unavailableTitle")} body={t("unavailable")} retryLabel={rs("retry")} />
    </ConsultPage>
  );

  // each part loads on its own (as in the app): a failed vitals summary is said in its place, the rest of the hub stays
  const summary = await getPatientVitalSummary(token).catch(() => null);
  if (summary?.status === 401) redirect(`/${locale}/login`);
  const vitals = summary?.ok ? extractVitalSummary(await summary.json().catch(() => null)) : null;

  const [scoreRes, remindersRes, appointmentRes] = await Promise.all([
    getPatientHealthScore(token).catch(() => null),
    getPatientMedicationReminders(token).catch(() => null),
    // issue 678: the same request as the home page's "next appointment" card (GET /home/upcoming-appointment)
    getPatientDashboardUpcomingAppointment(token).catch(() => null),
  ]);
  const nextAppointment = appointmentRes?.ok ? parseDashboardAppointment(await appointmentRes.json().catch(() => null)) : null;
  const nextAppointmentFailed = appointmentRes === null || (!appointmentRes.ok && appointmentRes.status !== 404);
  const consultStatus = await getTranslations("ConsultWeb");
  const nextStatus = nextAppointment ? appointmentStatusKey(nextAppointment.status ?? undefined) : null;
  const score = scoreRes?.ok ? parseHealthScore(await scoreRes.json().catch(() => null)) : null;
  const reminders = remindersRes?.ok ? extractMedicationReminderSummaries(await remindersRes.json().catch(() => null)) : null;
  const doses = reminders ? todayDoses(reminders) : [];
  if (vitals === null && !score && !reminders && !scoreRes?.ok && !remindersRes?.ok) return unavailable;

  const base = `/${locale}/health`;
  const latest = new Map((vitals ?? []).map((vital) => [vital.key, vital]));
  const shown = VITAL_ORDER.filter((key) => BOARD_VITALS.includes(key) || latest.has(key));
  const caret = getDirection(locale) === "rtl" ? "caret-left" : "caret-right";
  const statuses = { taken: t("dose.taken"), pending: t("dose.pending"), skipped: t("dose.skipped"), missed: t("dose.missed") };
  const care = SERVICE_ICONS.health;

  return (
    <ConsultPage locale={locale} title={t("title")}>
      <div className={styles.toolbar}>
        <span />
        <Link href={`/${locale}/reports/passport`} className={styles.iconButton} aria-label={t("healthId")}>
          <FIcon icon="identification-card" tone="blue" size={32} chip="none" />
        </Link>
      </div>

      <RowCard href={`${base}/profile`} icon="identification-card" tone="blue" title={t("fileTitle")} sub={t("fileSub")} caret={<Icon name={caret} size={16} tone="secondary" />} />

      {nextAppointment ? (
        <RowCard
          href={`/${locale}/appointments/${encodeURIComponent(nextAppointment.id)}`}
          title={nextAppointment.doctorName ?? t("nextAppointment")}
          sub={nextAppointment.doctorName ? t("nextAppointment") : undefined}
          extra={
            <>
              {nextAppointment.dateLabel ? <LocalTimeLine iso={nextAppointment.dateLabel} locale={locale} /> : null}
              {nextStatus ? <span>{consultStatus(`status.${nextStatus}`)}</span> : null}
            </>
          }
          caret={<Icon name={caret} size={16} tone="secondary" />}
        />
      ) : nextAppointmentFailed ? <PartUnavailable>{t("nextAppointmentUnavailable")}</PartUnavailable> : null}

      {score ? (
        <section className={rx.card} aria-labelledby="health-score">
          <Link href={`${base}/vitals`} className={styles.scoreLink} aria-label={t("scoreOpen")}>
            {score.score != null ? (
              <div className={styles.score}>
                <ScoreRing value={score.score} label={t("scoreTitle")} valueText={new Intl.NumberFormat(locale).format(score.score)} caption="/100" tone={scoreTone(score.status)} />
                <div className={styles.scoreBody}>
                  <h2 id="health-score" className={styles.sectionTitle}>{t("scoreTitle")}</h2>
                  {t.has(`scoreLevel.${score.status}`) ? <span className={`${styles.pill} ${styles[`pill_${scoreTone(score.status)}`]}`}>{t(`scoreLevel.${score.status}`)}</span> : null}
                </div>
              </div>
            ) : (
              <div className={styles.scoreBody}>
                <h2 id="health-score" className={styles.sectionTitle}>{t("scoreTitle")}</h2>
                <span className={rx.cardLabel}>{t("scoreEmpty")}</span>
              </div>
            )}
            {score.components.length ? (
              <ul className={styles.parts} aria-label={t("scoreParts")}>
                {score.components.map((part) => (
                  <li className={styles.part} key={part.key}><span className={rx.cardLabel}>{t.has(`scoreComp.${part.key}`) ? t(`scoreComp.${part.key}`) : part.key}</span><span className={styles.partValue}>{new Intl.NumberFormat(locale).format(part.score)}</span></li>
                ))}
              </ul>
            ) : null}
            {score.recommendationKey && t.has(`scoreRec.${score.recommendationKey}`) ? <p className={rx.note}>{t(`scoreRec.${score.recommendationKey}`)}</p> : null}
          </Link>
          <p className={rx.note}>{t("scoreNotice")}</p>
        </section>
      ) : scoreRes ? <PartUnavailable>{t("scoreUnavailable")}</PartUnavailable> : null}

      <SectionHead id="health-vitals" title={t("vitalsTitle")} action={{ href: `${base}/vitals?tab=today&add=1`, label: t("addReading") }} />
      {vitals === null ? <PartUnavailable>{t("vitalsUnavailable")}</PartUnavailable> : <ul className={styles.tiles} aria-labelledby="health-vitals">
        {shown.map((key) => {
          const vital = latest.get(key);
          const view = VITAL_VIEW[key];
          return (
            <li key={key}>
              <VitalTile
                href={`${base}/vitals?tab=${vital ? "history" : "today"}`}
                label={t(`vital.${key}`)}
                value={vital ? vital.value : "—"}
                unit={vital?.unit}
                when={vital?.measuredAt ? <>{t("lastMeasured")} <LocalTimeLine iso={vital.measuredAt} locale={locale} /></> : t("noReading")}
                icon={view.icon}
                tone={view.tone}
              />
            </li>
          );
        })}
      </ul>}

      <SectionHead id="health-today" title={t("todayTitle")} action={{ href: `${base}/medications`, label: t("remindersLink") }} />
      {reminders === null ? (
        <PartUnavailable>{t("todayUnavailable")}</PartUnavailable>
      ) : doses.length ? (
        <section className={`${rx.card} ${rx.cardFlush}`} aria-labelledby="health-today"><ul className={styles.rows}><DoseRows rows={doses} labels={{ statuses, medicineUnavailable: t("medicineUnavailable") }} /></ul></section>
      ) : (
        <p className={rx.note}>{t("todayEmpty")}</p>
      )}

      <SectionHead id="health-records" title={t("recordsTitle")} />
      <RowsCard label={t("recordsTitle")}>
        {[
          { href: `${base}/records?tab=reports`, icon: "file-text" as const, tone: TEAL, label: t("tabReports") },
          { href: `${base}/records?tab=prescriptions`, icon: "prescription" as const, tone: CORAL, label: t("tabPrescriptions") },
          { href: `${base}/records?tab=timeline`, icon: "clock-counter-clockwise" as const, tone: "blue" as const, label: t("tabTimeline") },
          { href: `${base}/medications`, icon: "pill" as const, tone: CORAL, label: t("medicationsTitle") },
          { href: `${base}/profile?tab=conditions`, icon: "heartbeat" as const, tone: CORAL, label: t("hubChronic"), sub: t("hubChronicHint") },
          { href: `${base}/vitals?tab=trends`, icon: "chart-line-up" as const, tone: CORAL, label: t("hubTrends"), sub: t("hubTrendsHint") },
          { href: `${base}/sleep`, icon: "moon" as const, tone: "violet" as const, label: t("sleepTitle") },
          ...(wearablesOn() ? [{ href: `${base}/wearables`, icon: care.icon, tone: care.tone, label: t("wearablesTitle") }] : []),
        ].map((row) => (
          <li key={row.href}>
            <Link className={`${styles.row} ${rx.rowLink}`} href={row.href}>
              <FIcon icon={row.icon} tone={row.tone} size={40} />
              <span className={styles.rowBody}><span className={styles.rowTitle}>{row.label}</span>{"sub" in row && row.sub ? <span className={styles.rowSub}>{row.sub}</span> : null}</span>
              <span className={rx.rowEnd}><Icon name={caret} size={16} tone="secondary" /></span>
            </Link>
          </li>
        ))}
      </RowsCard>
      <RowsCard label={t("hubMoreTitle")}>
        {[
          { href: `/${locale}/family`, icon: "users-three" as const, tone: "peach" as const, label: t("hubFamily"), sub: t("hubFamilyHint") },
          { href: `/${locale}/family/chat`, icon: "chat-circle-text" as const, tone: "blue" as const, label: t("hubFamilyChat"), sub: t("hubFamilyChatHint") },
          { href: `/${locale}/nursing`, icon: "first-aid-kit" as const, tone: TEAL, label: t("hubNursing"), sub: t("hubNursingHint") },
          { href: `/${locale}/programs/active`, icon: "clipboard-text" as const, tone: TEAL, label: t("hubPrograms"), sub: t("hubProgramsHint") },
          { href: `/${locale}/articles`, icon: "clipboard-text" as const, tone: SERVICE_ICONS.nutrition.tone, label: t("hubArticles"), sub: t("hubArticlesHint") },
          { href: `/${locale}/loyalty`, icon: "star" as const, tone: "amber" as const, label: t("hubChallenges"), sub: t("hubChallengesHint") },
        ].map((row) => (
          <li key={row.href}>
            <Link className={`${styles.row} ${rx.rowLink}`} href={row.href}>
              <FIcon icon={row.icon} tone={row.tone} size={40} />
              <span className={styles.rowBody}><span className={styles.rowTitle}>{row.label}</span><span className={styles.rowSub}>{row.sub}</span></span>
              <span className={rx.rowEnd}><Icon name={caret} size={16} tone="secondary" /></span>
            </Link>
          </li>
        ))}
      </RowsCard>
      <Notice>{t("notice")}</Notice>
    </ConsultPage>
  );
}
