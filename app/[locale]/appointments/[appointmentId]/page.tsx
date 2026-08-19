import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { extractAppointmentDetail, parseAppointmentId } from "@/lib/api/appointments";
import { getPatientAppointment } from "@/lib/api/appointments-server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";

type Props = { params: Promise<{ locale: string; appointmentId: string }> };

export default async function AppointmentDetailPage({ params }: Props) {
  const { locale, appointmentId } = await params;
  if (!isLocale(locale) || !parseAppointmentId(appointmentId).success) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Appointments");
  const token = await requirePatientAccess(locale);
  const response = await getPatientAppointment(token, appointmentId);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  if (!response.ok) return <main className="main dashboard"><section className="status-card" role="alert"><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p></section></main>;
  const appointment = extractAppointmentDetail(await response.json().catch(() => null));
  if (!appointment) return <main className="main dashboard"><section className="status-card" role="alert"><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p></section></main>;
  const serviceLabel = appointment.serviceType === "clinic" ? t("services.clinic") : appointment.serviceType === "video" ? t("services.video") : appointment.serviceType === "home" ? t("services.home") : t("serviceUnavailable");
  return <main className="main dashboard"><Link className="back-link" href={`/${locale}/appointments`}>{t("back")}</Link><div className="eyebrow">{t("eyebrow")}</div><h1>{appointment.doctorName || serviceLabel}</h1><section className="status-card"><dl className="order-detail"><div><dt>{t("service")}</dt><dd>{serviceLabel}</dd></div><div><dt>{t("status")}</dt><dd>{appointment.status || t("statusUnavailable")}</dd></div>{appointment.slotStart ? <div><dt>{t("scheduled")}</dt><dd>{new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(appointment.slotStart))}</dd></div> : null}{appointment.specialty ? <div><dt>{t("specialty")}</dt><dd>{appointment.specialty}</dd></div> : null}</dl><p>{t("detailNotice")}</p></section></main>;
}
