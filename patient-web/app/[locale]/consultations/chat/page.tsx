import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";

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
  if (!doctorId) redirect(`/${locale}/chat`);
  const token = await requirePatientAccess(locale);

  const profile = await callPatientApi(`/care/doctors/${encodeURIComponent(doctorId)}`, {}, token);
  if (profile.status === 401) redirect(`/${locale}/login`);
  if (!profile.ok) {
    const c = await getTranslations("ConsultWeb");
    const rs = await getTranslations("RouteState");
    return (
      <ConsultPage locale={locale} title={c("chatDoctorTitle")} backHref={`/${locale}/consultations`}>
        <ConsultState kind="error" title={c("chatDoctorTitle")} body={c("chatDoctorFailed")} retryLabel={rs("retry")} />
      </ConsultPage>
    );
  }
  const praw = asRecord(await profile.json().catch(() => null));
  const prec = asRecord(praw?.data) ?? praw;
  const otherUserId = (prec && [prec.user_id, prec.account_id, prec.doctor_user_id].find((v) => typeof v === "string" && (v as string).trim())) as string | undefined;
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
