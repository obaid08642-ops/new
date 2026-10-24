import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";
import { extractAppointmentDetail } from "@/lib/api/appointments";
import { APPOINTMENT_ID, isJoinable, statusKey, statusTone } from "@/lib/consult/appointment-view";
import { CallTokenLauncher } from "@/components-next/call-token-launcher";
import { readTelehealthConsent } from "@/lib/legal/telehealth-consent";
import { getPublicConfig } from "@/lib/api/public-config-server";
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
  const payload = await response.json().catch(() => null);
  const appointment = extractAppointmentDetail(payload);
  if (!appointment) notFound();
  // the app shows the server's own `wait_time` only when it sent one, and hides the join when the video-call switch is off (errors fail open)
  const rawWait = Number(((payload && typeof payload === "object" && "data" in payload ? (payload as { data?: { wait_time?: unknown } }).data : payload) as { wait_time?: unknown } | null)?.wait_time);
  const waitTime = Number.isFinite(rawWait) && rawWait >= 0 ? new Intl.NumberFormat(locale, { minimumIntegerDigits: 2, useGrouping: false }).format(rawWait) : null;
  const callsOff = (await getPublicConfig().catch(() => null))?.features?.video_calls === false;
  const joinable = isJoinable(appointment.status) && !callsOff;
  const key = statusKey(appointment.status);

  return (
    <ConsultPage locale={locale} title={c("waitingRoomTitle")} backHref={`/${locale}/appointments/${encodeURIComponent(appointmentId)}`}>
      <Hero icon="video-camera" tone="violet" title={appointment.doctorName ?? c("waitingRoomTitle")} sub={c("waitingRoomTitle")}>
        <span className={styles.chips} role="status"><StatusChip label={key ? c(`status.${key}`) : a("statusUnavailable")} tone={statusTone(appointment.status)} /></span>
      </Hero>
      {waitTime ? <Notice>{c("waitingRoomYourTurn")}: <bdi>{waitTime}</bdi></Notice> : null}
      {callsOff ? <Notice>{c("waitingRoomCallsOff")}</Notice> : joinable ? (
        <CallTokenLauncher
          appointmentId={appointmentId}
          joinHref={`/${locale}/consultations/video-call?appointmentId=${encodeURIComponent(appointmentId)}`}
          locale={locale}
          consent={await readTelehealthConsent(locale)}
          labels={{ title: a("callTitle"), join: a("callJoin"), loading: a("callLoading"), ready: a("callReady"), unavailable: a("callUnavailable"), notReady: a("callDiscard"), open: a("callOpen") }}
        />
      ) : (
        <Notice>{c("waitingRoomNotYet")}</Notice>
      )}
    </ConsultPage>
  );
}
