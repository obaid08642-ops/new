import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Bell, Clock3, ShieldAlert } from "lucide-react";
import { extractPatientNotifications } from "@/lib/api/notifications";
import { getPatientNotifications } from "@/lib/api/notifications-server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { RetryButton } from "@/components-next/retry-button";
import styles from "./notifications.module.css";

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
  if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><span className={styles.stateIcon}><Bell size={25} aria-hidden="true" /></span><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p><RetryButton /></section></main>;
  const notifications = extractPatientNotifications(await response.json().catch(() => null));
  return <main className={`main ${styles.page}`}><section className={styles.header}><div><p className={styles.eyebrow}>{t("eyebrow")}</p><h1>{t("title")}</h1></div><span className={styles.headerIcon}><Bell size={26} aria-hidden="true" /></span></section>{notifications.length === 0 ? <section className={styles.state}><span className={styles.stateIcon}><Bell size={25} aria-hidden="true" /></span><h2>{t("title")}</h2><p>{t("empty")}</p></section> : <section className={styles.list} aria-label={t("title")}>{notifications.map((notification) => { const elevated = ["high", "critical", "urgent"].includes(notification.priority?.toLowerCase() || ""); return <article className={`${styles.card} ${notification.read === false ? styles.unread : ""}`} key={notification.id}><span className={`${styles.icon} ${elevated ? styles.iconPriority : ""}`}>{elevated ? <ShieldAlert size={20} aria-hidden="true" /> : <Bell size={20} aria-hidden="true" />}</span><div className={styles.body}><div className={styles.titleRow}><strong className={styles.title}>{notification.title || t("untitled")}</strong>{notification.read === false ? <span className={styles.dot} aria-label={t("unread")} /> : null}</div>{notification.body ? <p className={styles.copy}>{notification.body}</p> : null}{notification.createdAt ? <span className={styles.meta}><span className={styles.time}><Clock3 size={13} aria-hidden="true" />{new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(notification.createdAt))}</span></span> : null}</div></article>; })}</section>}<p className={styles.notice}>{t("notice")}</p></main>;
}
