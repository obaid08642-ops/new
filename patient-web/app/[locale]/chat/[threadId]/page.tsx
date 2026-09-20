import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CalendarDays, ChevronLeft, FileText, MessageCircle, ShieldCheck } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { VectorSupport } from "@/components-next/vector-illustrations";
import { extractChatMessageSummaries, extractChatThreadSummaries } from "@/lib/api/chat";
import { getPatientChatMessages, getPatientChatThread } from "@/lib/api/chat-server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { RetryButton } from "@/components-next/retry-button";
import styles from "../chat.module.css";

type Props = { params: Promise<{ locale: string; threadId: string }> };

export default async function ChatThreadPage({ params }: Props) {
  const { locale, threadId } = await params;
  if (!isLocale(locale) || !/^[0-9a-f-]{36}$/i.test(threadId)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("ChatDetail");
  const token = await requirePatientAccess(locale);
  let threadResponse: Response;
  let messagesResponse: Response;
  try {
    [threadResponse, messagesResponse] = await Promise.all([getPatientChatThread(token, threadId), getPatientChatMessages(token, threadId)]);
  } catch {
    return (
      <main className={`main ${styles.page}`} style={{ background: "#FDFDFC", display: "grid", gap: 16, padding: 16 }}>
        <section className={styles.state} role="alert" style={{ border: "1px solid #E8EDEE", borderRadius: 20, background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", padding: 16, display: "grid", gap: 8, placeItems: "center", textAlign: "center" }}>
          <h1 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as React.CSSProperties}>{t("unavailableTitle")}</h1>
          <p style={{ color: "#6B7C6E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as React.CSSProperties}>{t("unavailable")}</p>
          <RetryButton />
        </section>
      </main>
    );
  }
  if ([threadResponse, messagesResponse].some((response) => response.status === 401)) redirect(`/${locale}/login`);
  if ([threadResponse, messagesResponse].some((response) => response.status === 403 || response.status === 404)) notFound();
  if ([threadResponse, messagesResponse].some((response) => !response.ok))
    return (
      <main className={`main ${styles.page}`} style={{ background: "#FDFDFC", display: "grid", gap: 16, padding: 16 }}>
        <section className={styles.state} role="alert" style={{ border: "1px solid #E8EDEE", borderRadius: 20, background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", padding: 16, display: "grid", gap: 8, placeItems: "center", textAlign: "center" }}>
          <h1 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as React.CSSProperties}>{t("unavailableTitle")}</h1>
          <p style={{ color: "#6B7C6E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as React.CSSProperties}>{t("unavailable")}</p>
          <RetryButton />
        </section>
      </main>
    );
  const thread = extractChatThreadSummaries({ data: [await threadResponse.json().catch(() => null)] })[0];
  const messages = extractChatMessageSummaries(await messagesResponse.json().catch(() => null));
  return (
    <main className={`main ${styles.page}`} style={{ background: "#FDFDFC", display: "grid", gap: 16, padding: 16 }}>
      <Link className={styles.activity} href={`/${locale}/chat`} style={{ color: "#1E332E", background: "#5FD9B3", border: "1px solid #5FD9B3", borderRadius: 20, padding: "8px 12px", fontWeight: 760, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8, width: "fit-content" }}>
        <ChevronLeft size={17} aria-hidden="true" />
        {t("back")}
      </Link>
      <section className={styles.intro} style={{ background: "rgba(255,255,255,.76)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid #E8EDEE", borderRadius: 20, padding: 16, display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center" }}>
        <div className={styles.introText} style={{ display: "grid", gap: 8, minWidth: 0 }}>
          <p className={styles.eyebrow} style={{ color: "#1E332E", display: "inline-flex", alignItems: "center", gap: 8, overflowWrap: "anywhere" } as any}>
            <ShieldCheck size={15} aria-hidden="true" color="#1E332E" />
            {t("eyebrow")}
          </p>
          <h1 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as React.CSSProperties}>{thread ? t(`types.${thread.type}`) : t("thread")}</h1>
        </div>
        <span className={styles.introIcon} style={{ inlineSize: 48, blockSize: 48, borderRadius: 20, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.9)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 } as any}>
          <VectorSupport size={48} aria-hidden="true" />
        </span>
      </section>
      <section className={styles.grid} aria-label={t("messagesTitle")} style={{ display: "grid", gap: 8 }}>
        {messages.length ? (
          messages.map((message) => (
            <article className={styles.card} key={message.id} style={{ border: "1px solid #E8EDEE", borderRadius: 20, padding: 16, background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", display: "flex", gap: 8, alignItems: "center" }}>
              <span className={styles.cardIcon} style={{ inlineSize: 48, blockSize: 48, borderRadius: 20, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.9)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {message.hasAttachment ? <FileText size={19} aria-hidden="true" color="#1E332E" /> : <MessageCircle size={19} aria-hidden="true" color="#1E332E" />}
              </span>
              <div className={styles.cardBody} style={{ display: "grid", gap: 8, minWidth: 0 }}>
                <strong className={styles.type} style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as React.CSSProperties}>{message.deleted ? t("deleted") : t(`messageTypes.${message.type}`)}</strong>
                <span className={styles.activity} style={{ color: "#6B7C6E", display: "inline-flex", alignItems: "center", gap: 8, overflowWrap: "anywhere" } as any}>
                  <CalendarDays size={14} aria-hidden="true" color="#1E332E" />
                  {message.createdAt
                    ? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(message.createdAt))
                    : t("timeUnavailable")}
                </span>
                {message.hasAttachment ? <span className={styles.activity} style={{ color: "#6B7C6E", overflowWrap: "anywhere" } as React.CSSProperties}>{t("attachmentHidden")}</span> : null}
              </div>
            </article>
          ))
        ) : (
          <section className={styles.state} style={{ border: "1px solid #E8EDEE", borderRadius: 20, background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", padding: 16, display: "grid", gap: 8, placeItems: "center", textAlign: "center" }}>
            <span style={{ inlineSize: 48, blockSize: 48, borderRadius: 20, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.9)", display: "inline-flex", alignItems: "center", justifyContent: "center" }} aria-hidden="true"><MessageCircle size={24} aria-hidden="true" color="#1E332E" /></span>
            <p style={{ color: "#6B7C6E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as React.CSSProperties}>{t("empty")}</p>
          </section>
        )}
      </section>
      <p className={styles.notice} style={{ color: "#6B7C6E", lineHeight: 1.7, overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as React.CSSProperties}>{t("bodyHidden")}</p>
    </main>
  );
}
