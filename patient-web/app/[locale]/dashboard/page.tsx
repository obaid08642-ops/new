import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { authCookieNames } from "@/lib/auth/cookies";
import { getPatientDashboardProfile, getPatientDashboardUpcomingAppointment } from "@/lib/api/dashboard-server";
import { callPatientApi } from "@/lib/api/upstream";
import { parseAccount } from "@/lib/loyalty/view";
import { parseDashboardAppointment, parseDashboardProfile } from "@/lib/api/dashboard";
import { parseRecordRows, parseReminderCard } from "@/lib/api/dashboard-extras";
import { isOutage } from "@/lib/api/outage";
import { getDisabledModules, readHomeContent, selectHomeSections } from "@/lib/api/public-config-server";
import { isPathHidden } from "@/lib/modules";
import { isLocale } from "@/lib/i18n";
import { RetryErrorState } from "@/components-next/core/core-states";
import { HomeShell } from "@/components-next/home/home-shell";
import { AiCard, AllServices, CuratedSections, PointsCard, AppointmentCard, HeroCard, RecordsCard, ReminderCard, ServiceGrid } from "@/components-next/home/home-parts";
import styles from "@/components-next/home/home.module.css";

/** The greeting follows the hour in the service's time zone (Riyadh), as the board's "مساء الخير". */
function greetingKey(now: Date): "greetingMorning" | "greetingAfternoon" | "greetingEvening" {
  const hour = Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone: "Asia/Riyadh" }).format(now));
  return hour < 12 ? "greetingMorning" : hour < 17 ? "greetingAfternoon" : "greetingEvening";
}

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) redirect("/ar/login");
  const token = (await cookies()).get(authCookieNames.access)?.value;
  if (!token) redirect(`/${locale}/login`);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "HomeWeb" });
  const dashboard = await getTranslations({ locale, namespace: "Dashboard" });
  const disabled = await getDisabledModules();
  const [profileResult, appointmentResult] = await Promise.allSettled([
    getPatientDashboardProfile(token),
    getPatientDashboardUpcomingAppointment(token),
  ]);
  if ([profileResult, appointmentResult].some((result) => result.status === "fulfilled" && result.value.status === 401)) {
    redirect(`/${locale}/login`);
  }
  // A FAILURE of either call (no answer, or a 5xx) is an outage, not an account without data: the error state with a retry
  // shows inside the shell. An empty 200 (no upcoming appointment) or a 4xx for an optional part still just hides.
  const outage = [profileResult, appointmentResult].some((result) => result.status === "rejected" || isOutage(result.value));
  if (outage) {
    return (
      <HomeShell locale={locale} signedIn surface="dashboard">
        <div className={styles.page}>
          <RetryErrorState title={t("unavailableTitle")} body={t("unavailableBody")} retryLabel={t("retry")} />
        </div>
      </HomeShell>
    );
  }
  const profile = profileResult.status === "fulfilled" && profileResult.value.ok
    ? parseDashboardProfile(await profileResult.value.json().catch(() => null))
    : { name: null };
  const appointment = appointmentResult.status === "fulfilled" && appointmentResult.value.ok
    ? parseDashboardAppointment(await appointmentResult.value.json().catch(() => null))
    : null;
  // The curated offers and packages are optional: a failed read hides the section, it never fails the dashboard.
  const homeSections = selectHomeSections((await readHomeContent().catch(() => null))?.data ?? null);
  // The points card shows a number only when the API returned one.
  const loyalty = isPathHidden(`/${locale}/loyalty`, disabled) ? null : await callPatientApi("/loyalty/account", {}, token).catch(() => null);
  const points = loyalty?.ok ? parseAccount(await loyalty.json().catch(() => null)).points : null;
  // The reminder card and the records rows are optional parts of the page, as in the app: a failed or forbidden read leaves
  // that part out, it never fails the dashboard and never shows a made-up value.
  const optionalJson = async (path: string, module: string): Promise<unknown | null> => {
    if (isPathHidden(`/${locale}/${module}`, disabled)) return null;
    const res = await callPatientApi(path, {}, token).catch(() => null);
    return res?.ok ? await res.json().catch(() => null) : null;
  };
  const [remindersPayload, nutritionPayload, vitalsPayload, moodPayload, maternityPayload] = await Promise.all([
    optionalJson("/health/reminders", "health"),
    optionalJson("/nutrition/daily-summary", "nutrition"),
    optionalJson("/health/vitals/summary", "health"),
    optionalJson("/mental-health/mood?days=1", "mental-health"),
    optionalJson("/maternity/profile", "maternity"),
  ]);
  const reminderCard = remindersPayload === null ? null : parseReminderCard(remindersPayload);
  const recordRows = parseRecordRows({ nutrition: nutritionPayload, vitals: vitalsPayload, mood: moodPayload, maternity: maternityPayload });
  const hub = await getTranslations({ locale, namespace: "LoyaltyHubWeb" });
  const showAppointment = Boolean(appointment) && !isPathHidden(`/${locale}/appointments`, disabled);
  return (
    <HomeShell locale={locale} signedIn name={profile.name} surface="dashboard">
      <div className={styles.page}>
        <div className={styles.heroGrid} data-aside={showAppointment ? "true" : "false"}>
          <HeroCard
            locale={locale}
            t={t}
            eyebrow={profile.name ? t(greetingKey(new Date())) : undefined}
            title={profile.name ?? dashboard("title")}
            headingId="patient-dashboard-title"
          />
          {appointment && showAppointment ? (
            <div className={styles.aside}>
              <AppointmentCard locale={locale} t={t} appointment={appointment} />
            </div>
          ) : null}
        </div>
        {reminderCard ? <ReminderCard locale={locale} t={t} card={reminderCard} /> : null}
        <ServiceGrid locale={locale} t={t} signedIn disabled={disabled} />
        <RecordsCard locale={locale} t={t} rows={recordRows} disabled={disabled} />
        <CuratedSections sections={homeSections} locale={locale} t={t} disabled={disabled} />
        <AiCard locale={locale} t={t} disabled={disabled} />
        {points !== null ? <PointsCard locale={locale} label={dashboard("loyalty")} value={hub("pointsAmount", { points: new Intl.NumberFormat(locale).format(points) })} /> : null}
        <AllServices locale={locale} t={t} labels={dashboard} disabled={disabled} />
      </div>
    </HomeShell>
  );
}
