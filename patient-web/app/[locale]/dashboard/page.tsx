import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Activity, Bell, BookOpen, CalendarDays, ChevronLeft, ChevronRight, ClipboardList, FileText, Gift, HeartPulse, HousePlus, LifeBuoy, MessageCircle, Pill, ScanLine, Search, Settings, Siren, Stethoscope, UserRound, UsersRound } from "lucide-react";
import type { CSSProperties } from "react";
import { authCookieNames } from "@/lib/auth/cookies";
import { getPatientDashboardProfile, getPatientDashboardUpcomingAppointment } from "@/lib/api/dashboard-server";
import { parseDashboardAppointment, parseDashboardProfile } from "@/lib/api/dashboard";
import { isLocale } from "@/lib/i18n";
import { PulseShieldMark } from "@/components-next/pulse-shield-mark";
import { VectorHealthShield } from "@/components-next/vector-illustrations";
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
  { key: "search", href: "search", icon: Search },
  { key: "offers", href: "offers", icon: Gift },
  { key: "programs", href: "programs", icon: Activity },
  { key: "returns", href: "returns", icon: ClipboardList },
  { key: "community", href: "community", icon: UsersRound },
  { key: "nutrition", href: "nutrition", icon: Activity },
  { key: "maternity", href: "maternity", icon: HeartPulse },
  { key: "aiTriage", href: "ai", icon: Stethoscope },
  { key: "reports", href: "reports", icon: FileText },
  { key: "loyalty", href: "loyalty", icon: Gift },
  { key: "support", href: "support", icon: LifeBuoy },
  { key: "emergency", href: "emergency", icon: Siren },
  { key: "profile", href: "profile", icon: UserRound },
  { key: "settings", href: "settings", icon: Settings },
  { key: "articles", href: "articles", icon: BookOpen },
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
  return <main className={`main ${styles.dashboard}`} style={{ background: "#FDFDFC" }}>
    <section className={styles.hero} aria-labelledby="patient-dashboard-title" style={{ background: "rgba(255,255,255,.76)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid #E8EDEE", borderRadius: 20, padding: 16, gap: 8 } as any}>
      <div className={styles.heroTop}><span className={styles.heroBadge} style={{ color: "#1E332E" }}>{t("eyebrow")}</span><div className={styles.heroActions} style={{ display: "flex", gap: 8 }}><Link className={styles.iconAction} href={`/${locale}/notifications`} aria-label={t("notifications") as string} style={{ border: "1px solid #E8EDEE", borderRadius: 20, padding: 8, background: "rgba(255,255,255,.82)" }}><Bell size={19} aria-hidden="true" color="#1E332E" /></Link><Link className={styles.iconAction} href={`/${locale}/profile`} aria-label={t("profile") as string} style={{ border: "1px solid #E8EDEE", borderRadius: 20, padding: 8, background: "rgba(255,255,255,.82)" }}><UserRound size={19} aria-hidden="true" color="#1E332E" /></Link><span style={{ inlineSize: 48, blockSize: 48, borderRadius: 20, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.9)", backdropFilter: "blur(16px)", display: "inline-flex", alignItems: "center", justifyContent: "center" }} aria-hidden="true"><VectorHealthShield size={48} aria-hidden="true" /></span></div></div>
      <div className={styles.heroGreeting}><span className={styles.pulseMark}><PulseShieldMark decorative /></span><div className={styles.heroText} style={{ display: "grid", gap: 8 }}><h1 id="patient-dashboard-title" style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{profile.name ? `${t("title")} — ${profile.name}` : t("title")}</h1><p style={{ color: "#6B7C6E", lineHeight: 1.7, overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{t("body")}</p></div></div>
    </section>
    <section className={styles.section} aria-labelledby="quick-access-title" style={{ display: "grid", gap: 8, padding: 16, border: "1px solid #E8EDEE", borderRadius: 20, background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" } as any}><div className={styles.sectionHeading} style={{ display: "grid", gap: 8 }}><h2 id="quick-access-title" style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{t("eyebrow")}</h2><span style={{ color: "#6B7C6E", overflowWrap: "anywhere" } as any}>{t("title")}</span></div><nav className={styles.quickGrid} aria-label={t("title") as string} style={{ display: "grid", gap: 8 }}>{quickDestinations.map(({ key, href, icon: Icon, accent }) => <Link key={key} className={styles.quickTile} href={`/${locale}/${href}`} style={{ "--tile-accent": accent, border: "1px solid #E8EDEE", borderRadius: 20, padding: 16, background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", color: "#1E332E", gap: 8 } as CSSProperties}><span className={styles.quickIcon}><Icon size={23} aria-hidden="true" color="#1E332E" /></span><strong style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{t(key)}</strong></Link>)}</nav></section>
    <section className={styles.section} aria-label={t("appointments") as string} style={{ display: "grid", gap: 8, padding: 16, border: "1px solid #E8EDEE", borderRadius: 20, background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" } as any}><div className={styles.statusCard} style={{ display: "grid", gap: 8 }}><div className={styles.sectionHeading} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><h2 style={{ color: "#1E332E" }}>{t("appointments")}</h2><Link className={styles.moreLink} href={`/${locale}/appointments`} style={{ color: "#1E332E", border: "1px solid #E8EDEE", borderRadius: 20, padding: "8px 12px", background: "#5FD9B3", fontWeight: 760, textDecoration: "none" }}>{t("appointments")} <Chevron size={17} aria-hidden="true" /></Link></div>{appointment ? <div className={styles.appointmentSummary} style={{ display: "grid", gap: 8 }}><strong style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{appointment.doctorName ?? t("appointments")}</strong><span style={{ color: "#6B7C6E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{appointmentDate ?? appointment.status ?? t("body")}</span><Link className={styles.appointmentOpen} href={`/${locale}/appointments/${encodeURIComponent(appointment.id)}`} style={{ color: "#1E332E", background: "#5FD9B3", borderRadius: 20, padding: "8px 16px", border: "1px solid #5FD9B3", fontWeight: 760, textDecoration: "none", width: "fit-content" }}>{t("appointments")} <Chevron size={17} aria-hidden="true" /></Link></div> : <p className={styles.emptySummary} style={{ color: "#6B7C6E", overflowWrap: "anywhere" } as any}>{t("body")}</p>}</div></section>
    <section className={styles.section} aria-label={t("health") as string} style={{ display: "grid", gap: 8, padding: 16, border: "1px solid #E8EDEE", borderRadius: 20, background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" } as any}><div className={styles.featureGrid} style={{ display: "grid", gap: 8 }}>{featureDestinations.map(({ key, href, icon: Icon, accent }) => <Link key={key} className={styles.featureCard} href={`/${locale}/${href}`} style={{ "--feature-accent": accent, border: "1px solid #E8EDEE", borderRadius: 20, padding: 16, background: "rgba(255,255,255,.82)", color: "#1E332E", gap: 8 } as CSSProperties}><span className={styles.featureIcon}><Icon size={22} aria-hidden="true" color="#1E332E" /></span><span className={styles.featureContent} style={{ display: "grid", gap: 8 }}><strong style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{t(key)}</strong><span style={{ color: "#6B7C6E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{t("body")}</span></span><Chevron className={styles.chevron} size={18} aria-hidden="true" color="#1E332E" /></Link>)}</div></section>
    <section className={styles.section} aria-label={t("profile") as string} style={{ display: "grid", gap: 8, padding: 16, border: "1px solid #E8EDEE", borderRadius: 20, background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" } as any}><div className={styles.sectionHeading} style={{ display: "grid", gap: 8 }}><h2 style={{ color: "#1E332E" }}>{t("profile")}</h2><span style={{ color: "#6B7C6E", overflowWrap: "anywhere" } as any}>{t("body")}</span></div><nav className={styles.moreGrid} aria-label={t("profile") as string} style={{ display: "grid", gap: 8 }}>{moreDestinations.map(({ key, href, icon: Icon }) => <Link key={key} className={styles.moreLink} href={`/${locale}/${href}`} style={{ color: "#1E332E", border: "1px solid #E8EDEE", borderRadius: 20, padding: "8px 12px", background: "rgba(255,255,255,.9)", gap: 8, fontWeight: 700, textDecoration: "none" }}><span style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{t(key)}</span><Icon size={17} aria-hidden="true" color="#1E332E" /></Link>)}</nav></section>
  </main>;
}
