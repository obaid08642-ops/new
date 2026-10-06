import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";
import { extractAppointmentDetail } from "@/lib/api/appointments";
import { APPOINTMENT_ID, isDone, isJoinable, modeOf, statusKey, statusTone } from "@/lib/consult/appointment-view";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ActionLinks, Hero, type LinkAction } from "@/components-next/consult/consult-parts";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ appointmentId?: string }> };

/** Where a booking stands (canvas/BookingConfirm result): the status the server holds, and the next step for it. */
export default async function ConsultationBookingStatusPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  const appointmentId = (sp.appointmentId || "").trim();
  if (!isLocale(locale) || !APPOINTMENT_ID.test(appointmentId)) notFound();
  setRequestLocale(locale);
  const c = await getTranslations("ConsultWeb");
  const a = await getTranslations("Appointments");
  const token = await requirePatientAccess(locale);
  const response = await callPatientApi(`/care/appointments/${encodeURIComponent(appointmentId)}`, {}, token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (!response.ok) notFound();
  const appointment = extractAppointmentDetail(await response.json().catch(() => null));
  if (!appointment) notFound();
  const id = encodeURIComponent(appointmentId);
  const key = statusKey(appointment.status);
  const active = isJoinable(appointment.status);
  const isVideo = modeOf(appointment.serviceType) === "video";

  const actions: LinkAction[] = [];
  if (active && isVideo) actions.push({ href: `/${locale}/consultations/virtual-waiting-room?appointmentId=${id}`, label: c("actionWaitingRoom") });
  if (active && !isVideo) actions.push({ href: `/${locale}/appointments/${id}`, label: c("actionAppointmentDetails") });
  if (isDone(appointment.status)) actions.push({ href: `/${locale}/appointments/${id}/summary`, label: c("actionSummary") });
  actions.push({ href: `/${locale}/appointments`, label: c("actionMyAppointments"), variant: "outline" });

  return (
    <ConsultPage locale={locale} title={c("bookingStatusTitle")} backHref={`/${locale}/appointments/${id}`}>
      <Hero icon="check-circle" tone={statusTone(appointment.status)} title={key ? c(`status.${key}`) : a("statusUnavailable")} sub={appointment.doctorName} />
      <ActionLinks actions={actions} />
    </ConsultPage>
  );
}
