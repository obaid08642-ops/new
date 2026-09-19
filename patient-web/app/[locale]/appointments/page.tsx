import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CalendarDays, ChevronLeft, ChevronRight, Clock3 } from "lucide-react";
import { VectorDoctor } from "@/components-next/vector-illustrations";
import type { CSSProperties } from "react";
import { extractAppointmentRows } from "@/lib/api/appointments";
import { getPatientAppointments } from "@/lib/api/appointments-server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { RetryButton } from "@/components-next/retry-button";
import styles from "./appointments.module.css";

type Props = { params: Promise<{ locale: string }>; searchParams?: Promise<{ tab?: string }> };
type Tab = "upcoming" | "past";

const tabLabels: Record<string, { upcoming: string; past: string }> = {
  ar: { upcoming: "القادمة", past: "السابقة" }, en: { upcoming: "Upcoming", past: "Past" }, ur: { upcoming: "آنے والی", past: "پچھلی" },
  hi: { upcoming: "आगामी", past: "पिछली" }, bn: { upcoming: "আসন্ন", past: "আগের" }, fil: { upcoming: "Paparating", past: "Nakaraan" },
};

export default async function AppointmentsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { tab: requestedTab } = (await searchParams) ?? {};
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Appointments");
  const token = await requirePatientAccess(locale);
  const response = await getPatientAppointments(token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  const Chevron = locale === "ar" || locale === "ur" ? ChevronLeft : ChevronRight;
  if (!response.ok) return <main className={`main ${styles.page}`} style={{ background: "#FDFDFC", display: "grid", gap: 16 }}><section className={styles.state} role="alert" style={{ border: "1px solid #E8EDEE", borderRadius: 20, background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", padding: 16, gap: 8 }}><span className={styles.stateIcon} style={{ inlineSize: 48, blockSize: 48, borderRadius: 20, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.9)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><CalendarDays size={22} aria-hidden="true" color="#1E332E" /></span><h1 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{t("unavailableTitle")}</h1><p style={{ color: "#6B7C6E", overflowWrap: "anywhere" } as any}>{t("unavailableBody")}</p><RetryButton /></section></main>;
  const appointments = extractAppointmentRows(await response.json().catch(() => null));
  const activeTab: Tab = requestedTab === "past" ? "past" : "upcoming";
  const filteredAppointments = appointments.filter((appointment) => {
    const status = appointment.status?.toLowerCase();
    return activeTab === "upcoming" ? ["confirmed", "pending"].includes(status ?? "") : ["completed", "cancelled"].includes(status ?? "");
  });
  const labels = tabLabels[locale] ?? tabLabels.en;
  const serviceLabel = (serviceType?: string) => serviceType === "clinic" ? t("services.clinic") : serviceType === "video" ? t("services.video") : serviceType === "home" ? t("services.home") : t("serviceUnavailable");
  const statusStyle = (status?: string): CSSProperties => { const normalized = status?.toLowerCase(); if (normalized === "confirmed") return { "--status-color": "#1a9fb6", "--status-surface": "#def5f9" } as CSSProperties; if (normalized === "cancelled") return { "--status-color": "#c74c41", "--status-surface": "#fee2e2" } as CSSProperties; if (normalized === "completed") return { "--status-color": "#338b57", "--status-surface": "#dcfce7" } as CSSProperties; return { "--status-color": "#a16a0b", "--status-surface": "#fef3c7" } as CSSProperties; };
  return <main className={`main ${styles.page}`} style={{ background: "#FDFDFC", display: "grid", gap: 16 }}>
    <section className={styles.header} style={{ background: "rgba(255,255,255,.76)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid #E8EDEE", borderRadius: 20, padding: 16, display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center" }}>
      <div style={{ display: "grid", gap: 8 }}>
        <p className={styles.eyebrow} style={{ color: "#1E332E" }}>{t("eyebrow")}</p>
        <h1 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{t("title")}</h1>
        <Link className={styles.specialtiesLink} href={`/${locale}/consultations/specialties`} style={{ color: "#1E332E", border: "1px solid #E8EDEE", borderRadius: 20, padding: "8px 16px", background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", fontWeight: 700, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8, width: "fit-content" }}><VectorDoctor size={20} aria-hidden="true" />{t("browseSpecialties")}</Link>
      </div>
      <span className={styles.headerIcon} style={{ inlineSize: 48, blockSize: 48, borderRadius: 20, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.9)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }} aria-hidden="true"><VectorDoctor size={48} aria-hidden="true" /></span>
    </section>
    <nav className={styles.tabs} aria-label={t("title")} style={{ display: "flex", gap: 8 }}>
      <Link className={activeTab === "upcoming" ? styles.tabActive : styles.tab} href={`/${locale}/appointments?tab=upcoming`} aria-current={activeTab === "upcoming" ? "page" : undefined} style={activeTab === "upcoming" ? { background: "#5FD9B3", color: "#1E332E", border: "1px solid #5FD9B3", borderRadius: 20, padding: "8px 16px", fontWeight: 760, textDecoration: "none" } as any : { background: "rgba(255,255,255,.82)", color: "#1E332E", border: "1px solid #E8EDEE", borderRadius: 20, padding: "8px 16px", fontWeight: 700, textDecoration: "none", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" } as any}>{labels.upcoming}</Link>
      <Link className={activeTab === "past" ? styles.tabActive : styles.tab} href={`/${locale}/appointments?tab=past`} aria-current={activeTab === "past" ? "page" : undefined} style={activeTab === "past" ? { background: "#5FD9B3", color: "#1E332E", border: "1px solid #5FD9B3", borderRadius: 20, padding: "8px 16px", fontWeight: 760, textDecoration: "none" } as any : { background: "rgba(255,255,255,.82)", color: "#1E332E", border: "1px solid #E8EDEE", borderRadius: 20, padding: "8px 16px", fontWeight: 700, textDecoration: "none", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" } as any}>{labels.past}</Link>
    </nav>
    {filteredAppointments.length === 0 ? <section className={styles.state} style={{ border: "1px solid #E8EDEE", borderRadius: 20, background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", padding: 16, display: "grid", gap: 8, placeItems: "center" }}><span className={styles.stateIcon} style={{ inlineSize: 48, blockSize: 48, borderRadius: 20, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.9)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><CalendarDays size={22} aria-hidden="true" color="#1E332E" /></span><h2 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{t("title")}</h2><p style={{ color: "#6B7C6E", overflowWrap: "anywhere" } as any}>{t("empty")}</p></section> : <><p className={styles.notice} style={{ color: "#6B7C6E", overflowWrap: "anywhere" } as any}>{t("detailNotice")}</p><section className={styles.grid} aria-label={activeTab === "upcoming" ? labels.upcoming : labels.past} style={{ display: "grid", gap: 8 }}>{filteredAppointments.map((appointment) => <Link className={styles.card} key={appointment.id} href={`/${locale}/appointments/${appointment.id}`} style={{ border: "1px solid #E8EDEE", borderRadius: 20, background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", padding: 16, display: "grid", gap: 8, textDecoration: "none", color: "#1E332E" } as any}><span className={styles.cardTop} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><span className={styles.service} style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#1E332E" }}><span className={styles.serviceIcon} style={{ inlineSize: 48, blockSize: 48, borderRadius: 16, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.9)", display: "inline-flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(16px)" } as any}><VectorDoctor size={20} aria-hidden="true" /></span><span style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{serviceLabel(appointment.serviceType)}</span></span><span className={styles.status} style={{ ...statusStyle(appointment.status), borderRadius: 20, padding: "4px 10px", fontWeight: 700 } as any}>{appointment.status || t("statusUnavailable")}</span></span>{appointment.doctorName ? <strong className={styles.doctorName} style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{appointment.doctorName}</strong> : null}{appointment.slotStart ? <span className={styles.schedule} style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#6B7C6E" }}><Clock3 size={16} aria-hidden="true" />{t("scheduledAt", { value: new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(appointment.slotStart)) })}</span> : null}<span className={styles.footer} style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#1E332E", background: "#5FD9B3", border: "1px solid #5FD9B3", borderRadius: 20, padding: "8px 16px", fontWeight: 760, width: "fit-content" }}>{t("open")}<Chevron size={17} aria-hidden="true" /></span></Link>)}</section></>}</main>;
}
