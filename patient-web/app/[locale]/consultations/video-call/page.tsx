import { iceServersFrom, type IceServer } from "@/lib/calls/ice-servers";
import { redirect, notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isLocale } from "@/lib/i18n";
import { requirePatientAccess } from "@/lib/auth/session";
import { callPatientApi } from "@/lib/api/upstream";
import { VideoRoomClient } from "@/components-next/video-room-client";
import { livekitUrl } from "@/lib/consult/livekit-url";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { Hero } from "@/components-next/consult/consult-parts";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ appointmentId?: string }> };

export default async function VideoCallPage({ params, searchParams }: Props) {
  const { locale } = await params; if (!isLocale(locale)) notFound(); setRequestLocale(locale);
  const { appointmentId } = await searchParams;
  const token = await requirePatientAccess(locale); if (!token) redirect(`/${locale}/login`);
  if (!appointmentId || !/^[0-9a-f-]{36}$/i.test(appointmentId)) notFound();
  const c = await getTranslations("ConsultWeb");
  const rs = await getTranslations("RouteState");
  // Fetch ephemeral LiveKit credential server-side; never render the token in shared HTML.
  let credential: { token: string; room: string; audioOnly: boolean; iceServers: IceServer[] } | null = null; let reason: "not_ready" | "unavailable" | null = null;
  try {
    const r = await callPatientApi(`/unified-bookings/${appointmentId}/call-token`, { method: "GET" }, token);
    if (r.status === 409) reason = "not_ready"; else if (!r.ok) reason = "unavailable";
    else { const d = await r.json().catch(() => null); if (d?.provider === "livekit" && d.token && d.room) credential = { token: d.token, room: d.room, audioOnly: d.audio_only === true, iceServers: iceServersFrom(d.ice_servers) }; else reason = "unavailable"; }
  } catch { reason = "unavailable"; }
  return (
    <ConsultPage locale={locale} title={c("videoCallTitle")} backHref={`/${locale}/appointments/${appointmentId}`} width="wide">
      <Hero icon="video-camera" tone="violet" title={c("videoCallTitle")} sub={c("videoCallSub")} />
      {credential ? (
        <VideoRoomClient iceServers={credential.iceServers} startAudioOnly={credential.audioOnly} token={credential.token} serverUrl={livekitUrl()} chatHref={`/${locale}/appointments/${appointmentId}/chat`} ratingHref={`/${locale}/consultations/post-call-rating?appointmentId=${appointmentId}`} labels={{ connecting: c("callConnecting"), live: c("callLive"), waiting: c("callWaitingForDoctor"), ended: c("callEnded"), leave: c("callLeave"), microphone: c("callMicrophone"), camera: c("callCamera"), you: c("callYou"), doctor: c("callDoctor"), reconnecting: c("callReconnecting"), audioOnly: c("callAudioOnly"), tryVideo: c("callTryVideo"), dropped: c("callDropped"), continueInChat: c("callContinueInChat"), qualityYou: c("callQualityYou"), qualityOther: c("callQualityOther"), quality: { excellent: c("callQualityExcellent"), good: c("callQualityGood"), poor: c("callQualityPoor"), lost: c("callQualityLost"), unknown: c("callQualityUnknown") } }} />
      ) : (
        <ConsultState kind="error" title={reason === "not_ready" ? c("callNotReady") : c("callUnavailable")} body={c("callAvailableLater")} retryLabel={rs("retry")} />
      )}
    </ConsultPage>
  );
}
