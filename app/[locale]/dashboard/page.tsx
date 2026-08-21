import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Activity, Bell, CalendarDays, ChevronLeft, ChevronRight, ClipboardList, FileText, HeartPulse, HousePlus, MessageCircle, Pill, ScanLine, Settings, Stethoscope, UserRound, UsersRound } from "lucide-react";
import type { CSSProperties } from "react";
import { authCookieNames } from "@/lib/auth/cookies";
import { getPatientDashboardProfile, getPatientDashboardUpcomingAppointment } from "@/lib/api/dashboard-server";
import { parseDashboardAppointment, parseDashboardProfile } from "@/lib/api/dashboard";
import { isLocale } from "@/lib/i18n";
import { PulseShieldMark } from "@/components-next/pulse-shield-mark";
import styles from "./dashboard.module.css";

const quickDestinations = [
  { key: "appointments", href: "appointments", icon: CalendarDays, accent: "#2E86FF" },
  { key: "medicines", href: "medicines", icon: Pill, accent: "#16A34A" },
  { key: "diagnostics", href: "diagnostics", icon: ScanLine, accent: "#7A6BEA" },
  { key: "orders", href: "orders", icon: ClipboardList, accent: "#F0A526" },
  { key: "health", href: "health", icon: HeartPulse, accent: "#23B5CE" },
  { key: "homeCare", href: "home-care", icon: HousePlus, accent: "#E8568E" },
] as const;
const featureDestinations = [
  { key: "reminders", href: "reminders", icon: Pill, accent: "#2BB89C" },
  { key: "appointments", href: "appointments", icon: Stethoscope, accent: "#2E86FF" },
  { key: "health", href: "health", icon: Activity, accent: "#7A6BEA" },
] as const;
const moreDestinations = [
  { key: "prescriptions", href: "prescriptions", icon: FileText },
  { key: "family", href: "family", icon: UsersRound },
  { key: "chat", href: "chat", icon: MessageCircle },
  { key: "notifications", href: "notifications", icon: Bell },
  { key: "orders", href: "orders", icon: ClipboardList },
  { key: "profile", href: "profile", icon: UserRound },
  { key: "settings", href: "settings", icon: Settings },
] as const;

function formatDate(value: string | null, locale: string) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? null : new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(parsed);
}

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) redirect("/ar/login");
  const token = (await cookies()).get(authCookieNames.access)?.value;
  if (!token) redirect(`/${locale}/login`);
  setRequestLocale(locale);
  const t = await getTranslations("Dashboard");
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
  const appointmentDate = formatDate(appointment?.dateLabel ?? null, locale);
  const Chevron = locale === "ar" || locale === "ur" ? ChevronLeft : ChevronRight;
  return <main className={`main ${styles.dashboard}`}>
    <section className={styles.hero} aria-labelledby="patient-dashboard-title">
      <div className={styles.heroTop}><span className={styles.heroBadge}>{t("eyebrow")}</span><div className={styles.heroActions}><Link className={styles.iconAction} href={`/${locale}/notifications`} aria-label={t("notifications")}><Bell size={19} aria-hidden="true" /></Link><Link className={styles.iconAction} href={`/${locale}/profile`} aria-label={t("profile")}><UserRound size={19} aria-hidden="true" /></Link></div></div>
      <div className={styles.heroGreeting}><span className={styles.pulseMark}><PulseShieldMark decorative /></span><div className={styles.heroText}><h1 id="patient-dashboard-title">{profile.name ? `${t("title")} — ${profile.name}` : t("title")}</h1><p>{t("body")}</p></div></div>
    </section>
    <section className={styles.section} aria-labelledby="quick-access-title"><div className={styles.sectionHeading}><h2 id="quick-access-title">{t("eyebrow")}</h2><span>{t("title")}</span></div><nav className={styles.quickGrid} aria-label={t("title")}>{quickDestinations.map(({ key, href, icon: Icon, accent }) => <Link key={key} className={styles.quickTile} href={`/${locale}/${href}`} style={{ "--tile-accent": accent } as CSSProperties}><span className={styles.quickIcon}><Icon size={23} aria-hidden="true" /></span><strong>{t(key)}</strong></Link>)}</nav></section>
    <section className={styles.section} aria-label={t("appointments")}><div className={styles.statusCard}><div className={styles.sectionHeading}><h2>{t("appointments")}</h2><Link className={styles.moreLink} href={`/${locale}/appointments`}>{t("appointments")} <Chevron size={17} aria-hidden="true" /></Link></div>{appointment ? <div className={styles.appointmentSummary}><strong>{appointment.doctorName ?? t("appointments")}</strong><span>{appointmentDate ?? appointment.status ?? t("body")}</span><Link className={styles.appointmentOpen} href={`/${locale}/appointments/${encodeURIComponent(appointment.id)}`}>{t("appointments")} <Chevron size={17} aria-hidden="true" /></Link></div> : <p className={styles.emptySummary}>{t("body")}</p>}</div></section>
    <section className={styles.section} aria-label={t("health")}><div className={styles.featureGrid}>{featureDestinations.map(({ key, href, icon: Icon, accent }) => <Link key={key} className={styles.featureCard} href={`/${locale}/${href}`} style={{ "--feature-accent": accent } as CSSProperties}><span className={styles.featureIcon}><Icon size={22} aria-hidden="true" /></span><span className={styles.featureContent}><strong>{t(key)}</strong><span>{t("body")}</span></span><Chevron className={styles.chevron} size={18} aria-hidden="true" /></Link>)}</div></section>
    <section className={styles.section} aria-label={t("profile")}><div className={styles.sectionHeading}><h2>{t("profile")}</h2><span>{t("body")}</span></div><nav className={styles.moreGrid} aria-label={t("profile")}>{moreDestinations.map(({ key, href, icon: Icon }) => <Link key={key} className={styles.moreLink} href={`/${locale}/${href}`}><span>{t(key)}</span><Icon size={17} aria-hidden="true" /></Link>)}</nav></section>
  </main>;
}
