import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { extractChatMessageSummaries, extractChatThreadSummaries } from "@/lib/api/chat";
import { getPatientChatMessages, getPatientChatPermissions, getPatientChatThread } from "@/lib/api/chat-server";
import { parseThreadPermissions, followUpTarget, windowBanner } from "@/lib/chat/permissions";
import { callPatientApi } from "@/lib/api/upstream";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ChatComposer } from "@/components-next/consult/chat-composer";
import { ConsultState } from "@/components-next/consult/consult-state";
import { ActionLinks, Notice, RowCard } from "@/components-next/consult/consult-parts";
import { LocalTimeLine } from "@/components-next/consult/local-time-line";
import styles from "@/components-next/consult/consult.module.css";

type Props = { params: Promise<{ locale: string; threadId: string }> };

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

/**
 * The doctor's thread of a booking (no board; decision 24): the activity of its messages (type and time), never their text, names
 * or attachments. It is reached from the booking (the appointment page, a notification about it), carries the emergency number,
 * and when the server says the thread is closed (is_active false) it is read-only with the follow-up button. The screen never
 * counts a window itself.
 */
export default async function ChatThreadPage({ params }: Props) {
  const { locale, threadId } = await params;
  if (!isLocale(locale) || !/^[0-9a-f-]{36}$/i.test(threadId)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("ChatDetail");
  const rs = await getTranslations("RouteState");
  const token = await requirePatientAccess(locale);
  const back = `/${locale}/appointments`;
  const failed = (
    <ConsultPage locale={locale} title={t("thread")} backHref={back}>
      <ConsultState kind="error" title={t("unavailableTitle")} body={t("unavailable")} retryLabel={rs("retry")} />
    </ConsultPage>
  );
  let threadResponse: Response;
  let messagesResponse: Response;
  try {
    [threadResponse, messagesResponse] = await Promise.all([getPatientChatThread(token, threadId), getPatientChatMessages(token, threadId)]);
  } catch {
    return failed;
  }
  if ([threadResponse, messagesResponse].some((response) => response.status === 401)) redirect(`/${locale}/login`);
  if ([threadResponse, messagesResponse].some((response) => response.status === 403 || response.status === 404)) notFound();
  if ([threadResponse, messagesResponse].some((response) => !response.ok)) return failed;
  const threadRaw = await threadResponse.json().catch(() => null);
  const thread = extractChatThreadSummaries({ data: [threadRaw] })[0];
  const threadRecord = asRecord(asRecord(threadRaw)?.data) ?? asRecord(threadRaw);
  // The server's rules (GET /chat/threads/:id/permissions). If that answer is missing the page keeps to is_active, as before.
  const permissions = await getPatientChatPermissions(token, threadId).then(async (r) => (r.ok ? parseThreadPermissions(await r.json().catch(() => null)) : null), () => null);
  const closed = permissions ? permissions.readOnly : threadRecord?.is_active === false;
  const bookingId = typeof threadRecord?.booking_id === "string" ? threadRecord.booking_id : "";
  const isConsultation = threadRecord?.booking_kind === "consultation" && bookingId.length > 0;
  let followUpHref: string | undefined;
  const target = closed && isConsultation ? followUpTarget(permissions, "", bookingId) : null;
  if (target) {
    followUpHref = `/${locale}/consultations/book/${encodeURIComponent(target.doctorId)}?followUp=${encodeURIComponent(target.appointmentId)}`;
  } else if (closed && isConsultation) {
    const appt = await callPatientApi(`/care/appointments/${encodeURIComponent(bookingId)}`, {}, token);
    const araw = appt.ok ? asRecord(await appt.json().catch(() => null)) : null;
    const arec = asRecord(araw?.data) ?? araw;
    const doctorId = typeof arec?.doctor_id === "string" ? arec.doctor_id : "";
    if (doctorId) followUpHref = `/${locale}/consultations/book/${encodeURIComponent(doctorId)}?followUp=${encodeURIComponent(bookingId)}`;
  }
  const messages = extractChatMessageSummaries(await messagesResponse.json().catch(() => null));
  const banner = windowBanner(permissions);
  const title = thread ? t(`types.${thread.type}`) : t("thread");
  return (
    <ConsultPage locale={locale} title={title} backHref={isConsultation ? `${back}/${encodeURIComponent(bookingId)}` : back}>
      <Notice>{t("emergency")} <a href={`tel:${permissions?.emergencyLine ?? "997"}`}>{t("emergencyCall")}</a></Notice>
      {banner ? <p className={styles.rowSub} data-testid="chat-window-banner">{t(`window.${banner.statusKey}`)}{banner.remaining ? ` · ${t(`window.${banner.remaining.key}`, { count: banner.remaining.count })}` : ""}</p> : null}
      {messages.length === 0 ? (
        <ConsultState kind="empty" icon="chat-circle-text" title={t("messagesTitle")} body={t("empty")} />
      ) : (
        <ul className={styles.list} aria-label={t("messagesTitle")}>
          {messages.map((message) => (
            <li key={message.id}>
              <RowCard
                icon={message.hasAttachment ? "file-text" : "chat-circle-text"}
                title={message.deleted ? t("deleted") : t(`messageTypes.${message.type}`)}
                sub={message.createdAt ? undefined : t("timeUnavailable")}
                extra={
                  <>
                    {message.createdAt ? <LocalTimeLine iso={message.createdAt} locale={locale} className={styles.rowSub} /> : null}
                    {message.hasAttachment ? <span className={styles.rowSub}>{t("attachmentHidden")}</span> : null}
                  </>
                }
              />
            </li>
          ))}
        </ul>
      )}
      {/* issue 806: text composer, only where the server's rules say the patient may chat and the thread is not read-only */}
      {permissions?.canChat && !permissions.readOnly ? <ChatComposer threadId={threadId} /> : null}
      {closed ? <Notice>{t("closed")}</Notice> : null}
      {followUpHref ? <ActionLinks actions={[{ href: followUpHref, label: t("bookFollowUp") }]} /> : null}
      <Notice>{t("bodyHidden")}</Notice>
    </ConsultPage>
  );
}
