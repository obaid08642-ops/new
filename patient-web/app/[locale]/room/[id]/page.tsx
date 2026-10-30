import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";
import { VideoRoomClient } from "@/components-next/video-room-client";
import { livekitUrl } from "@/lib/consult/livekit-url";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";

type Props = { params: Promise<{ locale: string; id: string }> };

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

/** Parity with app room/[id]: join call room server-side, never mint tokens locally. */
export default async function CallRoomPage({ params }: Props) {
  const { locale, id } = await params;
  if (!isLocale(locale) || !id.trim()) notFound();
  setRequestLocale(locale);
  const c = await getTranslations("ConsultWeb");
  const rs = await getTranslations("RouteState");
  const token = await requirePatientAccess(locale);
  // POST /calls/:sessionId/join -> { room_name, token } (backend livekit.controller.ts joinCall); there is no POST /calls/:id.
  const join = await callPatientApi(`/calls/${encodeURIComponent(id)}/join`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }, token);
  if (join.status === 401) redirect(`/${locale}/login`);
  if (join.status === 403 || join.status === 404) notFound();
  const jraw = asRecord(await join.json().catch(() => null));
  const jrec = asRecord(jraw?.data) ?? jraw;
  const roomToken = typeof jrec?.token === "string" ? jrec.token : null;
  // P14.22: a dropped call offers the appointment's chat (the join answer names the appointment of the call)
  const appointmentId = typeof jrec?.appointment_id === "string" && /^[0-9a-f-]{36}$/i.test(jrec.appointment_id) ? jrec.appointment_id : null;
  if (!join.ok || !roomToken) {
    return (
      <ConsultPage locale={locale} title={c("roomErrorTitle")} backHref={`/${locale}/consultations`}>
        <ConsultState kind="error" title={c("roomErrorTitle")} body={c("roomErrorBody")} retryLabel={rs("retry")} />
      </ConsultPage>
    );
  }
  return (
    <ConsultPage locale={locale} title={c("roomTitle")} backHref={`/${locale}/consultations`} width="wide">
      <VideoRoomClient
        startAudioOnly={jrec?.audio_only === true}
        token={roomToken}
        chatHref={appointmentId ? `/${locale}/appointments/${appointmentId}/chat` : undefined}
        serverUrl={livekitUrl()}
        labels={{ connecting: c("roomPreparing"), live: c("callLive"), waiting: c("callWaitingForDoctor"), ended: c("callEnded"), leave: c("callLeave"), microphone: c("callMicrophone"), camera: c("callCamera"), you: c("callYou"), doctor: c("callDoctor"), reconnecting: c("callReconnecting"), audioOnly: c("callAudioOnly"), tryVideo: c("callTryVideo"), dropped: c("callDropped"), continueInChat: c("callContinueInChat"), qualityYou: c("callQualityYou"), qualityOther: c("callQualityOther"), quality: { excellent: c("callQualityExcellent"), good: c("callQualityGood"), poor: c("callQualityPoor"), lost: c("callQualityLost"), unknown: c("callQualityUnknown") } }}
      />
    </ConsultPage>
  );
}
