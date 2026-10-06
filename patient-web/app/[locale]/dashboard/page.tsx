import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { authCookieNames } from "@/lib/auth/cookies";
import { getPatientDashboardProfile, getPatientDashboardUpcomingAppointment } from "@/lib/api/dashboard-server";
import { parseDashboardAppointment, parseDashboardProfile } from "@/lib/api/dashboard";
import { isLocale } from "@/lib/i18n";
import { HomeShell } from "@/components-next/home/home-shell";
import { AiCard, AllServices, AppointmentCard, HeroCard, ServiceGrid } from "@/components-next/home/home-parts";
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
  const [profileResult, appointmentResult] = await Promise.allSettled([
    getPatientDashboardProfile(token),
    getPatientDashboardUpcomingAppointment(token),
  ]);
  if ([profileResult, appointmentResult].some((result) => result.status === "fulfilled" && result.value.status === 401)) {
    redirect(`/${locale}/login`);
  }
  const profile = profileResult.status === "fulfilled" && profileResult.value.ok
    ? parseDashboardProfile(await profileResult.value.json().catch(() => null))
    : { name: null };
  const appointment = appointmentResult.status === "fulfilled" && appointmentResult.value.ok
    ? parseDashboardAppointment(await appointmentResult.value.json().catch(() => null))
    : null;
  return (
    <HomeShell locale={locale} signedIn name={profile.name} surface="dashboard">
      <div className={styles.page}>
        <div className={styles.heroGrid} data-aside={appointment ? "true" : "false"}>
          <HeroCard
            locale={locale}
            t={t}
            eyebrow={profile.name ? t(greetingKey(new Date())) : undefined}
            title={profile.name ?? dashboard("title")}
            headingId="patient-dashboard-title"
          />
          {appointment ? (
            <div className={styles.aside}>
              <AppointmentCard locale={locale} t={t} appointment={appointment} />
            </div>
          ) : null}
        </div>
        <ServiceGrid locale={locale} t={t} />
        <AiCard locale={locale} t={t} />
        <AllServices locale={locale} t={t} labels={dashboard} />
      </div>
    </HomeShell>
  );
}
