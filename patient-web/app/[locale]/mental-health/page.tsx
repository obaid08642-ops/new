import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { callPatientApi } from "@/lib/api/upstream";
import { parseWellbeingDashboard } from "@/lib/api/mental-health";
import { getDirection, isLocale } from "@/lib/i18n";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { Notice, RowCard } from "@/components-next/consult/consult-parts";
import { CareHero } from "@/components-next/care/care-kit";
import { SectionHead, VitalTile } from "@/components-next/health/health-kit";
import { Icon } from "@/components-next/ui-generated/src/Icon";
import { SERVICE_ICONS } from "@/components-next/ui-generated/icons/fill";
import styles from "@/components-next/health/health.module.css";

type Props = { params: Promise<{ locale: string }> };
const MIND = SERVICE_ICONS.mind;

/**
 * Mental health hub (canvas/CareHub; merge map section 5): the self-reported summary (GET /mental-health/dashboard) and the way into
 * the mood journal, Relax (breathing and meditation) and therapist booking (the doctor list filtered to psychiatry).
 * Owner decision 8: no self-assessment, no scoring, no in-app crisis handling. The one "Need urgent help?" button (the phone
 * dialer, number from the admin config) is NOT drawn: GET /system-config/public has no such number yet (Needs review), and no number
 * is ever written in the code.
 */
export default async function MentalHealthPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("MentalWeb");
  const rs = await getTranslations("RouteState");
  const token = await requirePatientAccess(locale);
  const caret = getDirection(locale) === "rtl" ? "caret-left" : "caret-right";
  const unavailable = (
    <ConsultPage locale={locale} title={t("title")} backHref={`/${locale}/dashboard`}>
      <ConsultState kind="error" title={t("unavailableTitle")} body={t("unavailable")} retryLabel={rs("retry")} />
    </ConsultPage>
  );

  let response: Response;
  try {
    response = await callPatientApi("/mental-health/dashboard", {}, token);
  } catch {
    return unavailable;
  }
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  if (!response.ok) return unavailable;
  const data = parseWellbeingDashboard(await response.json().catch(() => null));
  if (!data) return unavailable;

  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  const stat = (value: number | null) => (value === null ? t("notAvailable") : number.format(value));
  const arrow = <Icon name={caret} size={16} tone="secondary" />;

  return (
    <ConsultPage locale={locale} title={t("title")} backHref={`/${locale}/dashboard`}>
      <CareHero tone={MIND.tone} icon={MIND.icon} label={t("title")} title={t("heroTitle")} lines={[t("heroSub")]} />
      <ul className={styles.tiles} aria-label={t("summary")}>
        <li><VitalTile label={t("moodEntries")} value={number.format(data.mood.totalEntries)} icon="heart" tone="pink" /></li>
        <li><VitalTile label={t("avgMood")} value={stat(data.mood.avgMood)} icon="sparkle" tone="amber" /></li>
        <li><VitalTile label={t("avgEnergy")} value={stat(data.mood.avgEnergy)} icon="star" tone="mint" /></li>
        <li><VitalTile label={t("avgStress")} value={stat(data.mood.avgStress)} icon="heartbeat" tone="peach" /></li>
        <li><VitalTile label={t("meditationSessions")} value={number.format(data.meditation.totalSessions)} icon="brain" tone="violet" /></li>
        <li><VitalTile label={t("meditationMinutes")} value={number.format(data.meditation.totalMinutes)} unit={t("minutes")} icon="moon" tone="blue" /></li>
      </ul>
      <SectionHead id="care" title={t("careTitle")} />
      <RowCard href={`/${locale}/mental-health/mood`} icon="heart" tone="pink" title={t("moodRow")} sub={t("moodRowSub")} caret={arrow} />
      <RowCard href={`/${locale}/mental-health/relax`} icon="brain" tone="violet" title={t("relaxRow")} sub={t("relaxRowSub")} caret={arrow} />
      <RowCard href={`/${locale}/consultations/doctors?specialty=psychiatry`} icon="stethoscope" tone="blue" title={t("therapistRow")} sub={t("therapistRowSub")} caret={arrow} />
      <Notice>{t("notice")}</Notice>
    </ConsultPage>
  );
}
