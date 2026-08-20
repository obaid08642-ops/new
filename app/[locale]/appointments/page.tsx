import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, Stethoscope } from "lucide-react";
import type { CSSProperties } from "react";
import { extractAppointmentRows } from "@/lib/api/appointments";
import { getPatientAppointments } from "@/lib/api/appointments-server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { RetryButton } from "@/components-next/retry-button";
import styles from "./appointments.module.css";

type Props = { params: Promise<{ locale: string }> };

export default async function AppointmentsPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Appointments");
  const token = await requirePatientAccess(locale);
  const response = await getPatientAppointments(token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  const Chevron = locale === "ar" || locale === "ur" ? ChevronLeft : ChevronRight;
  if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><span className={styles.stateIcon}><CalendarDays size={25} aria-hidden="true" /></span><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><RetryButton /></section></main>;
  const appointments = extractAppointmentRows(await response.json().catch(() => null));
  const serviceLabel = (serviceType?: string) => serviceType === "clinic" ? t("services.clinic") : serviceType === "video" ? t("services.video") : serviceType === "home" ? t("services.home") : t("serviceUnavailable");
  const statusStyle = (status?: string): CSSProperties => { const normalized = status?.toLowerCase(); if (normalized === "confirmed") return { "--status-color": "#1a9fb6", "--status-surface": "#def5f9" } as CSSProperties; if (normalized === "cancelled") return { "--status-color": "#c74c41", "--status-surface": "#fee2e2" } as CSSProperties; if (normalized === "completed") return { "--status-color": "#338b57", "--status-surface": "#dcfce7" } as CSSProperties; return { "--status-color": "#a16a0b", "--status-surface": "#fef3c7" } as CSSProperties; };
  return <main className={`main ${styles.page}`}><section className={styles.header}><div><p className={styles.eyebrow}>{t("eyebrow")}</p><h1>{t("title")}</h1></div><span className={styles.headerIcon}><CalendarDays size={26} aria-hidden="true" /></span></section>{appointments.length === 0 ? <section className={styles.state}><span className={styles.stateIcon}><CalendarDays size={25} aria-hidden="true" /></span><h2>{t("title")}</h2><p>{t("empty")}</p></section> : <><p className={styles.notice}>{t("detailNotice")}</p><section className={styles.grid} aria-label={t("title")}>{appointments.map((appointment) => <Link className={styles.card} key={appointment.id} href={`/${locale}/appointments/${appointment.id}`}><span className={styles.cardTop}><span className={styles.service}><span className={styles.serviceIcon}><Stethoscope size={18} aria-hidden="true" /></span>{serviceLabel(appointment.serviceType)}</span><span className={styles.status} style={statusStyle(appointment.status)}>{appointment.status || t("statusUnavailable")}</span></span>{appointment.slotStart ? <span className={styles.schedule}><Clock3 size={16} aria-hidden="true" />{t("scheduledAt", { value: new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(appointment.slotStart)) })}</span> : null}<span className={styles.footer}>{t("open")}<Chevron size={17} aria-hidden="true" /></span></Link>)}</section></>}</main>;
}
