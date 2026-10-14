import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";
import { APPOINTMENT_ID } from "@/lib/consult/appointment-view";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";

type Props = { params: Promise<{ locale: string; appointmentId: string }> };

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

/**
 * The doctor's thread of one booking (decision 24: doctor chat exists only inside a booking). It opens or creates the booking's
 * thread (POST /chat/threads/booking) and goes to it; the appointment page and the clinic confirmation link here.
 */
export default async function AppointmentChatPage({ params }: Props) {
  const { locale, appointmentId } = await params;
  if (!isLocale(locale) || !APPOINTMENT_ID.test(appointmentId)) notFound();
  setRequestLocale(locale);
  const token = await requirePatientAccess(locale);
  const id = encodeURIComponent(appointmentId);
  const thread = await callPatientApi(
    "/chat/threads/booking",
    { method: "POST", headers: { "content-type": "application/json", "idempotency-key": `web-chat-booking-${appointmentId}` }, body: JSON.stringify({ booking_kind: "consultation", booking_id: appointmentId }) },
    token,
  );
  if (thread.status === 401) redirect(`/${locale}/login`);
  const raw = thread.ok ? asRecord(await thread.json().catch(() => null)) : null;
  const record = asRecord(raw?.data) ?? raw;
  const threadId = [record?.id, record?.thread_id, record?.threadId].find((v) => typeof v === "string" && (v as string).trim());
  if (typeof threadId === "string") redirect(`/${locale}/chat/${encodeURIComponent(threadId)}`);
  const c = await getTranslations("ConsultWeb");
  const rs = await getTranslations("RouteState");
  return (
    <ConsultPage locale={locale} title={c("chatDoctorTitle")} backHref={`/${locale}/appointments/${id}`}>
      <ConsultState kind="error" title={c("chatDoctorTitle")} body={c("chatDoctorFailed")} retryLabel={rs("retry")} />
    </ConsultPage>
  );
}
