import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";
import { VideoRoomClient } from "@/components-next/video-room-client";
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
  const join = await callPatientApi(`/calls/${encodeURIComponent(id)}`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }, token);
  if (join.status === 401) redirect(`/${locale}/login`);
  if (join.status === 403 || join.status === 404) notFound();
  const jraw = asRecord(await join.json().catch(() => null));
  const jrec = asRecord(jraw?.data) ?? jraw;
  const roomToken = typeof jrec?.token === "string" ? jrec.token : null;
  const room = typeof jrec?.room === "string" ? jrec.room : id;
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
        token={roomToken}
        room={room}
        labels={{ connecting: c("roomPreparing"), ended: c("callEnded"), leave: c("callLeave"), mute: c("callMute"), camera: c("callCamera") }}
      />
    </ConsultPage>
  );
}
