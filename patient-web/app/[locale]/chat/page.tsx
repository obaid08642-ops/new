import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { extractChatThreadSummaries } from "@/lib/api/chat";
import { getPatientChatThreads } from "@/lib/api/chat-server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { RetryButton } from "@/components-next/retry-button";
import { CalendarDays, MessageCircle, ShieldCheck } from "lucide-react";
import { VectorSupport } from "@/components-next/vector-illustrations";
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
    if (!response.ok)
     return (
      <main className={`main ${styles.page}`} style={{ background: "#FDFDFC", display: "grid", gap: 16 }}>
        <section className={styles.state} role="alert" style={{ border: "1px solid #E8EDEE", borderRadius: 20, background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", padding: 16, gap: 8 }}>
          <span className={styles.stateIcon} style={{ inlineSize: 48, blockSize: 48, borderRadius: 20, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.9)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <MessageCircle size={22} aria-hidden="true" color="#1E332E" />
          </span>
          <h1 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{t("unavailableTitle")}</h1>
          <p style={{ color: "#6B7C6E", overflowWrap: "anywhere" } as any}>{t("unavailable")}</p>
          <RetryButton />
        </section>
      </main>
    );
  const threads = extractChatThreadSummaries(await response.json().catch(() => null));
  return <main className={`main ${styles.page}`} style={{ background: "#FDFDFC", display: "grid", gap: 16 }}>
    <section className={styles.intro} style={{ background: "rgba(255,255,255,.76)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid #E8EDEE", borderRadius: 20, padding: 16, display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center" }}>
      <div className={styles.introText} style={{ display: "grid", gap: 8, minWidth: 0 }}>
        <p className={styles.eyebrow} style={{ color: "#1E332E" }}>{<span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><ShieldCheck size={15} aria-hidden="true" />{t("eyebrow")}</span>}</p>
        <h1 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{t("title")}</h1>
      </div>
      <span className={styles.introIcon} style={{ inlineSize: 48, blockSize: 48, borderRadius: 20, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.9)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }} aria-hidden="true"><VectorSupport size={48} aria-hidden="true" /></span>
    </section>
      {threads.length === 0 ? (
        <section className={styles.state} style={{ border: "1px solid #E8EDEE", borderRadius: 20, background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", padding: 16, display: "grid", gap: 8, placeItems: "center" }}>
          <span className={styles.stateIcon} style={{ inlineSize: 48, blockSize: 48, borderRadius: 20, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.9)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><MessageCircle size={22} aria-hidden="true" color="#1E332E" /></span>
          <p style={{ color: "#6B7C6E", overflowWrap: "anywhere" } as any}>{t("empty")}</p>
        </section>
      ) : (
        <section className={styles.grid} aria-label={t("title")} style={{ display: "grid", gap: 8 }}>
          {threads.map((thread) => (
            <article className={styles.card} key={thread.id} style={{ border: "1px solid #E8EDEE", borderRadius: 20, background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", padding: 16, display: "grid", gap: 8 } as any}>
      <span className={styles.cardIcon} style={{ inlineSize: 48, blockSize: 48, borderRadius: 16, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.9)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><MessageCircle size={19} aria-hidden="true" color="#1E332E" /></span>
              <div className={styles.cardBody} style={{ display: "grid", gap: 8 }}>
                <strong className={styles.type} style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{t(`types.${thread.type}`)}</strong>
                {thread.lastActivityAt ? (
                  <span className={styles.activity} style={{ color: "#6B7C6E" }}>
                    <CalendarDays size={14} aria-hidden="true" />
                    {new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(thread.lastActivityAt))}
                  </span>
                ) : (
                  <span className={styles.activity} style={{ color: "#6B7C6E" }}>{t("activityUnavailable")}</span>
                )}
              </div>
            </article>
          ))}
        </section>
      )}
    <p className={styles.notice} style={{ color: "#6B7C6E", overflowWrap: "anywhere", border: "1px solid #E8EDEE", borderRadius: 16, background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", padding: 16, marginTop: 8 } as any}>{t("notice")}</p>
  </main>;
}
