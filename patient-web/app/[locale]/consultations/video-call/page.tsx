import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { ChevronLeft, Clock3 } from "lucide-react";
import { VectorDoctor } from "@/components-next/vector-illustrations";
import { isLocale } from "@/lib/i18n";
import { requirePatientAccess } from "@/lib/auth/session";
import { callPatientApi } from "@/lib/api/upstream";
import { VideoRoomClient } from "@/components-next/video-room-client";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ appointmentId?: string }> };

export default async function VideoCallPage({ params, searchParams }: Props) {
  const { locale } = await params; if (!isLocale(locale)) notFound(); setRequestLocale(locale);
  const { appointmentId } = await searchParams;
  const token = await requirePatientAccess(locale); if (!token) redirect(`/${locale}/login`);
  if (!appointmentId || !/^[0-9a-f-]{36}$/i.test(appointmentId)) notFound();
  const AR = locale === "ar" || locale === "ur";
  // Fetch ephemeral LiveKit credential server-side; never render the token in shared HTML.
  let credential: { token: string; room: string } | null = null; let reason: "not_ready" | "unavailable" | null = null;
  try {
    const r = await callPatientApi(`/unified-bookings/${appointmentId}/call-token`, { method: "GET" }, token);
    if (r.status === 409) reason = "not_ready"; else if (!r.ok) reason = "unavailable";
    else { const d = await r.json().catch(() => null); if (d?.provider === "livekit" && d.token && d.room) credential = { token: d.token, room: d.room }; else reason = "unavailable"; }
  } catch { reason = "unavailable"; }
   return <main className="main" style={{ background: "#FDFDFC", display: "grid", gap: 16 }}><Link href={`/${locale}/appointments/${appointmentId}`} style={{ color: "#1E332E", display: "inline-flex", alignItems: "center", gap: 8, overflowWrap: "anywhere" } as any}><ChevronLeft size={16} aria-hidden="true" />{AR ? "تفاصيل الموعد" : "Appointment details"}</Link>
    <section className="hero premium-hero" style={{ background: "rgba(253,253,252,0.92)", border: "1px solid #E8EDEE", borderRadius: 20, backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" } as any}><div className="premium-hero-copy"><div className="eyebrow" style={{ color: "#1E332E" } as any}><VectorDoctor size={48} aria-hidden="true" />{AR ? "استشارة مرئية" : "Video consultation"}</div><h1 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{AR ? "غرفة الاستشارة المرئية" : "Video consultation room"}</h1><p style={{ overflowWrap: "anywhere" } as any}>{AR ? "اتصال مباشر عبر LiveKit ببيانات اعتماد مؤقتة من الخادم." : "Direct LiveKit connection with ephemeral server credentials."}</p></div></section>
     {credential ? <VideoRoomClient token={credential.token} room={credential.room} labels={{ connecting: AR ? "جارٍ الاتصال…" : "Connecting…", ended: AR ? "انتهت المكالمة" : "Call ended", leave: AR ? "مغادرة" : "Leave", mute: AR ? "كتم" : "Mute", camera: AR ? "الكاميرا" : "Camera" }} />
       : <section className="state" role="alert" style={{ background: "rgba(253,253,252,0.92)", border: "1px solid #E8EDEE", borderRadius: 20, backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", padding: 16 } as any}><VectorDoctor size={48} aria-hidden="true" /><Clock3 size={26} aria-hidden="true" style={{ display: "none" } as any} /><h2 style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{reason === "not_ready" ? (AR ? "المكالمة غير جاهزة بعد" : "Call not ready yet") : (AR ? "تعذر الاتصال" : "Connection unavailable")}</h2><p style={{ overflowWrap: "anywhere" } as any}>{AR ? "يُنشأ الاتصال من الخادم عند جاهزية الموعد؛ لا يُنشأ محلياً." : "The session is created server-side when the appointment is ready."}</p></section>}
  </main>;
}
