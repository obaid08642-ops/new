import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getOptionalPatientAccessToken } from "@/lib/auth/session";
import { signInHref } from "@/lib/services/guest";
import { GuestSpecialtyPage } from "@/components-next/guest/guest-specialty-page";
import { callPatientApi } from "@/lib/api/upstream";
import { parseWellbeingDashboard } from "@/lib/api/mental-health";
import { getDirection, isLocale } from "@/lib/i18n";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { Notice, RowCard } from "@/components-next/consult/consult-parts";
import { CareHero } from "@/components-next/care/care-kit";
import { SectionHead, VitalTile } from "@/components-next/health/health-kit";
import { UrgentCall } from "@/components-next/emergency/urgent-call";
import { Icon } from "@/components-next/ui-generated/src/Icon";
import { SERVICE_ICONS } from "@/components-next/ui-generated/icons/fill";
import styles from "@/components-next/health/health.module.css";

type Props = { params: Promise<{ locale: string }> };
const MIND = SERVICE_ICONS.mind;

/**
 * Mental health hub (canvas/CareHub; merge map section 5): the self-reported summary (GET /mental-health/dashboard) and the way into
 * the mood journal and therapist booking (the doctor list filtered to psychiatry).
 * Owner decision 8: no self-assessment, no scoring, no in-app crisis handling. The urgent-help button calls the admin's number
 * (GET /mental-health/urgent-help, `mental_health_urgent_help`); without one it says so and offers 997. No number is written in the code.
 */
export default async function MentalHealthPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("MentalWeb");
  const rs = await getTranslations("RouteState");
  const token = await getOptionalPatientAccessToken();
  const caret = getDirection(locale) === "rtl" ? "caret-left" : "caret-right";
  if (!token) {
    // Issue 1550: a guest sees what the service is, its doctors and the urgent-help row; the mood summary needs a session.
    const g = await getTranslations("GuestServices");
    return (
      <GuestSpecialtyPage
        locale={locale}
        title={t("title")}
        tone={MIND.tone}
        icon={MIND.icon}
        heroTitle={g("mental.heroTitle")}
        heroBody={g("mental.heroBody")}
        specialty="psychiatry"
        doctorsTitle={g("mental.doctorsTitle")}
        action={{ id: "mental-sign-in", title: g("mental.actionTitle"), body: g("mental.actionBody"), label: g("mental.action"), next: `/${locale}/mental-health/mood` }}
      >
        <UrgentCall />
        <Notice>{t("notice")}</Notice>
      </GuestSpecialtyPage>
    );
  }
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
  if (response.status === 401) redirect(signInHref(locale, `/${locale}/mental-health`));
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
      </ul>
      <SectionHead id="care" title={t("careTitle")} />
      <RowCard href={`/${locale}/mental-health/mood`} icon="heart" tone="pink" title={t("moodRow")} sub={t("moodRowSub")} caret={arrow} />
      <RowCard href={`/${locale}/consultations/doctors?specialty=psychiatry`} icon="stethoscope" tone="blue" title={t("therapistRow")} sub={t("therapistRowSub")} caret={arrow} />
      <UrgentCall />
      <Notice>{t("notice")}</Notice>
    </ConsultPage>
  );
}
