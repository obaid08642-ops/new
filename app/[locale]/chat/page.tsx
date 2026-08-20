import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { extractChatThreadSummaries } from "@/lib/api/chat";
import { getPatientChatThreads } from "@/lib/api/chat-server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { RetryButton } from "@/components-next/retry-button";

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
  if (!response.ok) return <main className="main dashboard"><section className="status-card" role="alert"><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p><RetryButton /></section></main>;
  const threads = extractChatThreadSummaries(await response.json().catch(() => null));
  return <main className="main dashboard"><div className="eyebrow">{t("eyebrow")}</div><h1>{t("title")}</h1>{threads.length === 0 ? <section className="status-card"><p>{t("empty")}</p></section> : <section className="chat-grid" aria-label={t("title")}>{threads.map((thread) => <article className="chat-card" key={thread.id}><strong>{t(`types.${thread.type}`)}</strong>{thread.lastActivityAt ? <span>{new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(thread.lastActivityAt))}</span> : <span>{t("activityUnavailable")}</span>}</article>)}</section>}<p className="privacy-notice">{t("notice")}</p></main>;
}
