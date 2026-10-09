import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { extractPatientNotifications, webRouteForNotification, type PatientNotification } from "@/lib/api/notifications";
import { getPatientNotifications } from "@/lib/api/notifications-server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { EmptyState } from "@/components-next/ui-generated/components/Feedback";
import { SERVICE_ICONS, type FillIconName, type ServiceName, type ServiceTone } from "@/components-next/ui-generated/icons/fill";
import { CoreShell } from "@/components-next/core/core-shell";
import core from "@/components-next/core/core.module.css";
import { RetryErrorState } from "@/components-next/core/core-states";
import { NotificationsList, type NotificationGroup } from "./notifications-list";
import styles from "./notifications.module.css";

type Props = { params: Promise<{ locale: string }> };

/** The board's icon per kind of notification (canvas/Notifications); the tone follows the service the kind belongs to (handoff §1 service map). */
const toneOf = (service: ServiceName): ServiceTone => SERVICE_ICONS[service].tone;
const KIND: Record<string, { icon: FillIconName; tone: ServiceTone }> = {
  order: { icon: "moped", tone: toneOf("pharmacy") },
  appointment: { icon: "video-camera", tone: toneOf("radiology") },
  medication: { icon: "bell", tone: toneOf("nursing") },
  prescription: { icon: "file-text", tone: toneOf("lab") },
  emergency: { icon: "ambulance", tone: toneOf("emergency") },
  promo: { icon: "tag", tone: toneOf("points") },
  alert: { icon: "warning", tone: toneOf("points") },
  info: { icon: "bell", tone: toneOf("nursing") },
};
const URGENT = ["high", "critical", "urgent"];
const DAY = 24 * 60 * 60 * 1000;

function iconFor(n: PatientNotification) {
  const kind = KIND[n.type?.toLowerCase() || ""];
  if (kind) return kind;
  return URGENT.includes(n.priority?.toLowerCase() || "") ? KIND.alert : KIND.info;
}

/** "5 minutes ago" for the last day, the date after that; the language's own digits and words. */
function whenLabel(createdAt: string, locale: string, now: number) {
  const at = new Date(createdAt);
  if (Number.isNaN(at.getTime())) return null;
  const diff = now - at.getTime();
  if (diff >= 0 && diff < DAY) {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
    const minutes = Math.max(1, Math.round(diff / 60000));
    return { text: minutes < 60 ? rtf.format(-minutes, "minute") : rtf.format(-Math.round(minutes / 60), "hour"), iso: at.toISOString() };
  }
  return { text: new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(at), iso: at.toISOString() };
}

export default async function NotificationsPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Notifications");
  const routeState = await getTranslations("RouteState");
  const token = await requirePatientAccess(locale);
  const response = await getPatientNotifications(token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  const back = `/${locale}`;
  if (!response.ok) {
    return <CoreShell locale={locale} title={t("title")} backHref={back} width="narrow">
      <RetryErrorState title={t("unavailableTitle")} body={t("unavailable")} retryLabel={routeState("retry")} />
    </CoreShell>;
  }
  const notifications = extractPatientNotifications(await response.json().catch(() => null));
  const now = Date.now();
  const isToday = (n: PatientNotification) => {
    const at = n.createdAt ? new Date(n.createdAt).getTime() : Number.NaN;
    return !Number.isNaN(at) && now - at < DAY;
  };
  const groups = [
    { key: "today", title: t("today"), items: notifications.filter(isToday) },
    { key: "earlier", title: t("earlier"), items: notifications.filter((n) => !isToday(n)) },
  ].filter((g) => g.items.length > 0);
  // The client list gets plain data: the icon, the time text and the web page each notification opens (resolved here, so the
  // backend's app route is never sent to the browser).
  const rows: NotificationGroup[] = groups.map((group) => ({
    key: group.key,
    title: group.title,
    items: group.items.map((n) => {
      const kind = iconFor(n);
      return {
        id: n.id,
        title: n.title ?? null,
        body: n.body ?? null,
        when: n.createdAt ? whenLabel(n.createdAt, locale, now) : null,
        icon: kind.icon,
        tone: kind.tone,
        unread: n.read === false,
        href: webRouteForNotification(n.route, locale),
      };
    }),
  }));

  return <CoreShell locale={locale} title={t("title")} backHref={back} width="narrow">
    <div className={styles.head}>
      <h1 className={`${core.deskOnly} ${styles.deskTitle}`}>{t("title")}</h1>
      <Link className={styles.settingsLink} href={`/${locale}/settings/notifications`}>{t("settings")}</Link>
    </div>
    {notifications.length === 0 ? (
      <EmptyState icon="bell" tone={toneOf("nursing")} title={t("emptyTitle")} body={t("empty")} />
    ) : <NotificationsList groups={rows} />}
  </CoreShell>;
}
