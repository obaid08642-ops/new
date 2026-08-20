import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { extractChatThreadSummaries } from "@/lib/api/chat";
import { getPatientChatThreads } from "@/lib/api/chat-server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { RetryButton } from "@/components-next/retry-button";
import { CalendarDays, MessageCircle, ShieldCheck } from "lucide-react";
import styles from "./chat.module.css";

type Props = { params: Promise<{ locale: string }> };

export default async function ChatPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Chat");
  const token = await requirePatientAccess(locale);
  const response = await getPatientChatThreads(token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><MessageCircle size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p><RetryButton /></section></main>;
  const threads = extractChatThreadSummaries(await response.json().catch(() => null));
  return <main className={`main ${styles.page}`}>
    <section className={styles.intro}>
      <div className={styles.introText}>
        <p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true" />{t("eyebrow")}</p>
        <h1>{t("title")}</h1>
      </div>
      <span className={styles.introIcon}><MessageCircle size={27} aria-hidden="true" /></span>
    </section>
    {threads.length === 0 ? <section className={styles.state}><MessageCircle size={25} aria-hidden="true" /><p>{t("empty")}</p></section> : <section className={styles.grid} aria-label={t("title")}>{threads.map((thread) => <article className={styles.card} key={thread.id}>
      <span className={styles.cardIcon}><MessageCircle size={19} aria-hidden="true" /></span>
      <div className={styles.cardBody}>
        <strong className={styles.type}>{t(`types.${thread.type}`)}</strong>
        {thread.lastActivityAt ? <span className={styles.activity}><CalendarDays size={14} aria-hidden="true" />{new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(thread.lastActivityAt))}</span> : <span className={styles.activity}>{t("activityUnavailable")}</span>}
      </div>
    </article>)}</section>}
    <p className={styles.notice}>{t("notice")}</p>
  </main>;
}
