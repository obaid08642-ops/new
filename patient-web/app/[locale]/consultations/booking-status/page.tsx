import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";
import { extractAppointmentDetail } from "@/lib/api/appointments";
import { APPOINTMENT_ID, isDone, isJoinable, modeOf, statusKey, statusTone } from "@/lib/consult/appointment-view";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { clinicConfirmation } from "@/components-next/consult/clinic-confirmation";
import { ActionLinks, Hero, type LinkAction } from "@/components-next/consult/consult-parts";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ appointmentId?: string; id?: string; view?: string }> };

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

/**
 * Where a booking stands (canvas/BookingConfirm result): the status the server holds, and the next step for it. A confirmed clinic
 * booking also shows its confirmation here (reception code, the place, preparation, the cancel card): the old clinic-confirm page
 * read the same appointment through the same endpoint (merge map 2, section 1). `?view=location` shows the place only.
 */
export default async function ConsultationBookingStatusPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  const appointmentId = (sp.appointmentId || sp.id || "").trim();
  if (!isLocale(locale) || !APPOINTMENT_ID.test(appointmentId)) notFound();
  setRequestLocale(locale);
  const c = await getTranslations("ConsultWeb");
  const a = await getTranslations("Appointments");
  const token = await requirePatientAccess(locale);
  const response = await callPatientApi(`/care/appointments/${encodeURIComponent(appointmentId)}`, {}, token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (!response.ok) notFound();
  const payload = await response.json().catch(() => null);
  const appointment = extractAppointmentDetail(payload);
  if (!appointment) notFound();
  const raw = asRecord(payload);
  const record = asRecord(raw?.data) ?? raw;
  const id = encodeURIComponent(appointmentId);
  const key = statusKey(appointment.status);
  const active = isJoinable(appointment.status);
  const mode = modeOf(appointment.serviceType);
  const isVideo = mode === "video";
  const locationView = sp.view === "location" && mode === "clinic";
  const showClinic = Boolean(record) && mode === "clinic" && (locationView || active);
  const clinic = showClinic && record ? await clinicConfirmation({ locale, appointment: record, token, locationView }) : null;

  const actions: LinkAction[] = [];
  if (active && isVideo) actions.push({ href: `/${locale}/consultations/virtual-waiting-room?appointmentId=${id}`, label: c("actionWaitingRoom") });
  if (active && !isVideo && !showClinic) actions.push({ href: `/${locale}/appointments/${id}`, label: c("actionAppointmentDetails") });
  if (isDone(appointment.status)) actions.push({ href: `/${locale}/appointments/${id}`, label: c("actionSummary") });
  actions.push({ href: `/${locale}/appointments`, label: c("actionMyAppointments"), variant: "outline" });

  return (
    <ConsultPage locale={locale} title={locationView ? c("clinicLocationTitle") : showClinic ? c("clinicConfirmTitle") : c("bookingStatusTitle")} backHref={`/${locale}/appointments/${id}`}>
      {!locationView ? <Hero icon="check-circle" tone={statusTone(appointment.status)} title={key ? c(`status.${key}`) : a("statusUnavailable")} sub={appointment.doctorName} /> : null}
      {clinic}
      {!locationView ? <ActionLinks actions={actions} /> : null}
    </ConsultPage>
  );
}
