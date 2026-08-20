import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { extractPatientNotifications } from "@/lib/api/notifications";
import { getPatientNotifications } from "@/lib/api/notifications-server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { RetryButton } from "@/components-next/retry-button";

type Props = { params: Promise<{ locale: string }> };

export default async function NotificationsPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Notifications");
  const token = await requirePatientAccess(locale);
  const response = await getPatientNotifications(token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  if (!response.ok) return <main className="main dashboard"><section className="status-card" role="alert"><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p><RetryButton /></section></main>;
  const notifications = extractPatientNotifications(await response.json().catch(() => null));
  return <main className="main dashboard"><div className="eyebrow">{t("eyebrow")}</div><h1>{t("title")}</h1>{notifications.length === 0 ? <section className="status-card"><p>{t("empty")}</p></section> : <section className="notification-list" aria-label={t("title")}>{notifications.map((notification) => <article className="notification-card" key={notification.id}><div><strong>{notification.title || t("untitled")}</strong>{notification.read === false ? <span className="unread-badge">{t("unread")}</span> : null}</div>{notification.body ? <p>{notification.body}</p> : null}<span>{[notification.priority, notification.createdAt ? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(notification.createdAt)) : undefined].filter(Boolean).join(" · ")}</span></article>)}</section>}<p className="privacy-notice">{t("notice")}</p></main>;
}
