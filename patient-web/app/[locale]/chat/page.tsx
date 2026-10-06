import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { extractChatThreadSummaries } from "@/lib/api/chat";
import { getPatientChatThreads } from "@/lib/api/chat-server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { Notice, RowCard } from "@/components-next/consult/consult-parts";
import { LocalTimeLine } from "@/components-next/consult/local-time-line";
import styles from "@/components-next/consult/consult.module.css";

type Props = { params: Promise<{ locale: string }> };

/** The patient's chats (no board: the current list of chats, drawn with the shared rows). Only type and last activity are shown. */
export default async function ChatPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Chat");
  const rs = await getTranslations("RouteState");
  const token = await requirePatientAccess(locale);
  const response = await getPatientChatThreads(token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  const back = `/${locale}`;
  if (!response.ok) {
    return (
      <ConsultPage locale={locale} title={t("title")} backHref={back}>
        <ConsultState kind="error" title={t("unavailableTitle")} body={t("unavailable")} retryLabel={rs("retry")} />
      </ConsultPage>
    );
  }
  const threads = extractChatThreadSummaries(await response.json().catch(() => null));
  return (
    <ConsultPage locale={locale} title={t("title")} backHref={back}>
      {threads.length === 0 ? (
        <ConsultState kind="empty" icon="chat-circle-text" title={t("title")} body={t("empty")} />
      ) : (
        <ul className={styles.list} aria-label={t("title")}>
          {threads.map((thread) => (
            <li key={thread.id}>
              <RowCard
                icon="chat-circle-text"
                title={t(`types.${thread.type}`)}
                sub={thread.lastActivityAt ? undefined : t("activityUnavailable")}
                extra={thread.lastActivityAt ? <LocalTimeLine iso={thread.lastActivityAt} locale={locale} className={styles.rowSub} /> : undefined}
              />
            </li>
          ))}
        </ul>
      )}
      <Notice>{t("notice")}</Notice>
    </ConsultPage>
  );
}
