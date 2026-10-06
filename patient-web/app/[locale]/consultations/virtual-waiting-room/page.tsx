import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";
import { extractAppointmentDetail } from "@/lib/api/appointments";
import { APPOINTMENT_ID, isJoinable, statusKey, statusTone } from "@/lib/consult/appointment-view";
import { CallTokenLauncher } from "@/components-next/call-token-launcher";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { Hero, Notice } from "@/components-next/consult/consult-parts";
import { StatusChip } from "@/components-next/ui-generated/components/Controls";
import styles from "@/components-next/consult/consult.module.css";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ appointmentId?: string }> };

/** The waiting room before a video visit (no board: the current layout, tokens and shared components): the status, and the way into the call once it is due. */
export default async function VirtualWaitingRoomPage({ params, searchParams }: Props) {
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
  const joinable = isJoinable(appointment.status);
  const key = statusKey(appointment.status);

  return (
    <ConsultPage locale={locale} title={c("waitingRoomTitle")} backHref={`/${locale}/appointments/${encodeURIComponent(appointmentId)}`}>
      <Hero icon="video-camera" tone="violet" title={appointment.doctorName ?? c("waitingRoomTitle")} sub={c("waitingRoomTitle")}>
        <span className={styles.chips} role="status"><StatusChip label={key ? c(`status.${key}`) : a("statusUnavailable")} tone={statusTone(appointment.status)} /></span>
      </Hero>
      {joinable ? (
        <CallTokenLauncher
          appointmentId={appointmentId}
          labels={{ title: a("callTitle"), join: a("callJoin"), loading: a("callLoading"), ready: a("callReady"), unavailable: a("callUnavailable"), notReady: a("callDiscard") }}
        />
      ) : (
        <Notice>{c("waitingRoomNotYet")}</Notice>
      )}
    </ConsultPage>
  );
}
