import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { extractChatMessageSummaries, extractChatThreadSummaries } from "@/lib/api/chat";
import { getPatientChatMessages, getPatientChatThread } from "@/lib/api/chat-server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { Notice, RowCard } from "@/components-next/consult/consult-parts";
import { LocalTimeLine } from "@/components-next/consult/local-time-line";
import styles from "@/components-next/consult/consult.module.css";

type Props = { params: Promise<{ locale: string; threadId: string }> };

/** One chat (no board): the activity of its messages (type and time), never their text, names or attachments. */
export default async function ChatThreadPage({ params }: Props) {
  const { locale, threadId } = await params;
  if (!isLocale(locale) || !/^[0-9a-f-]{36}$/i.test(threadId)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("ChatDetail");
  const rs = await getTranslations("RouteState");
  const token = await requirePatientAccess(locale);
  const back = `/${locale}/chat`;
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
  const thread = extractChatThreadSummaries({ data: [await threadResponse.json().catch(() => null)] })[0];
  const messages = extractChatMessageSummaries(await messagesResponse.json().catch(() => null));
  const title = thread ? t(`types.${thread.type}`) : t("thread");
  return (
    <ConsultPage locale={locale} title={title} backHref={back}>
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
      <Notice>{t("bodyHidden")}</Notice>
    </ConsultPage>
  );
}
