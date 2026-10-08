import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";
import { VideoRoomClient } from "@/components-next/video-room-client";

type Props = { params: Promise<{ locale: string; id: string }> };

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

/** Parity with app room/[id]: join call room server-side, never mint tokens locally. */
export default async function CallRoomPage({ params }: Props) {
  const { locale, id } = await params;
  if (!isLocale(locale) || !id.trim()) notFound();
  setRequestLocale(locale);
  const ar = locale === "ar";
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
      <main className="main">
        <Link href={`/${locale}/consultations`}>{ar ? "الاستشارات" : "Consultations"}</Link>
        <h1>{ar ? "خطأ في الاتصال" : "Connection error"}</h1>
        <p role="alert">{ar ? "تعذر الانضمام للغرفة. يرجى التأكد من الموعد." : "Could not join the room. Please verify the appointment."}</p>
      </main>
    );
  }
  return (
    <main className="main">
      <Link href={`/${locale}/consultations`}>{ar ? "الاستشارات" : "Consultations"}</Link>
      <h1>{ar ? "غرفة الاستشارة" : "Consultation room"}</h1>
      <VideoRoomClient
        token={roomToken}
        room={room}
        labels={{
          connecting: ar ? "جاري تحضير غرفة الاستشارة…" : "Preparing the consultation room…",
          ended: ar ? "انتهت المكالمة" : "Call ended",
          leave: ar ? "مغادرة" : "Leave",
          mute: ar ? "كتم" : "Mute",
          camera: ar ? "الكاميرا" : "Camera",
        }}
      />
    </main>
  );
}
