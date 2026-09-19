import Link from "next/link";
import { VectorDoctor } from "@/components-next/vector-illustrations";
import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ doctorId?: string; id?: string }> };

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

/** Parity with app chat-with-doctor: resolve doctor user, get-or-create direct thread, open it. */
export default async function ConsultationChatPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  const doctorId = (sp.doctorId || sp.id || "").trim();
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const ar = locale === "ar";
  if (!doctorId) redirect(`/${locale}/chat`);
  const token = await requirePatientAccess(locale);

  const profile = await callPatientApi(`/care/doctors/${encodeURIComponent(doctorId)}`, {}, token);
  if (profile.status === 401) redirect(`/${locale}/login`);
  if (!profile.ok) {
    return (
      <main className="main" style={{ background: "#FDFDFC", display: "grid", gap: 16 }}>
        <Link href={`/${locale}/consultations`} style={{ color: "#1E332E", display: "inline-flex", alignItems: "center", gap: 8, border: "1px solid #E8EDEE", borderRadius: 20, padding: "8px 16px", background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", fontWeight: 700, textDecoration: "none", width: "fit-content" }}>{ar ? "الاستشارات" : "Consultations"}</Link>
        <section style={{ background: "rgba(255,255,255,.76)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid #E8EDEE", borderRadius: 20, padding: 16, display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center" }}>
          <div style={{ display: "grid", gap: 8, minWidth: 0 }}>
            <h1 style={{ color: "#1E332E", margin: 0, overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{ar ? "محادثة الطبيب" : "Chat with doctor"}</h1>
            <p role="alert" style={{ color: "#6B7C6E", margin: 0, overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{ar ? "تعذر فتح المحادثة — تحقق من الطبيب وحاول مجدداً" : "Could not open the chat — check the doctor and retry"}</p>
          </div>
          <span style={{ inlineSize: 48, blockSize: 48, borderRadius: 20, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.9)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }} aria-hidden="true"><VectorDoctor size={48} aria-hidden="true" /></span>
        </section>
      </main>
    );
  }
  const praw = asRecord(await profile.json().catch(() => null));
  const prec = asRecord(praw?.data) ?? praw;
  const otherUserId = prec && [prec.user_id, prec.account_id, prec.doctor_user_id].find((v) => typeof v === "string" && (v as string).trim());
  if (!otherUserId) redirect(`/${locale}/chat`);

  const thread = await callPatientApi("/chat/threads/direct", {
    method: "POST",
    headers: { "content-type": "application/json", "idempotency-key": `web-chat-direct-${doctorId}-${Date.now()}` },
    body: JSON.stringify({ other_user_id: otherUserId }),
  }, token);
  if (!thread.ok) redirect(`/${locale}/chat`);
  const traw = asRecord(await thread.json().catch(() => null));
  const trec = asRecord(traw?.data) ?? traw;
  const threadId = [trec?.id, trec?.thread_id, trec?.threadId].find((v) => typeof v === "string" && (v as string).trim());
  if (!threadId) redirect(`/${locale}/chat`);
  redirect(`/${locale}/chat/${encodeURIComponent(threadId as string)}`);
}
