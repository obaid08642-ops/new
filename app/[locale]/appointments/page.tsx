import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { extractAppointmentRows } from "@/lib/api/appointments";
import { getPatientAppointments } from "@/lib/api/appointments-server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { RetryButton } from "@/components-next/retry-button";

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
  if (!response.ok) return <main className="main dashboard"><section className="status-card" role="alert"><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><RetryButton /></section></main>;
  const appointments = extractAppointmentRows(await response.json().catch(() => null));
  const serviceLabel = (serviceType?: string) => serviceType === "clinic" ? t("services.clinic") : serviceType === "video" ? t("services.video") : serviceType === "home" ? t("services.home") : t("serviceUnavailable");
  return <main className="main dashboard"><div className="eyebrow">{t("eyebrow")}</div><h1>{t("title")}</h1>{appointments.length === 0 ? <section className="status-card"><p>{t("empty")}</p></section> : <section className="appointment-grid" aria-label={t("title")}>{appointments.map((appointment) => <Link className="appointment-card" key={appointment.id} href={`/${locale}/appointments/${appointment.id}`}><span className="appointment-service">{serviceLabel(appointment.serviceType)}</span><strong>{appointment.status || t("statusUnavailable")}</strong>{appointment.slotStart ? <span>{t("scheduledAt", { value: new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(appointment.slotStart)) })}</span> : null}<span className="appointment-open">{t("open")}</span></Link>)}</section>}</main>;
}
