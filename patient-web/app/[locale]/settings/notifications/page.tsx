import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPatientNotificationSettings } from "@/lib/api/notification-settings-server";
import { extractNotificationPreferences, NOTIFICATION_CATEGORIES, NOTIFICATION_CHANNELS } from "@/lib/api/notification-settings";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { Group } from "@/components-next/settings/settings-kit";
import { SwitchList, type SwitchRow } from "@/components-next/settings/switch-list";
import styles from "@/components-next/settings/settings.module.css";

type Props = { params: Promise<{ locale: string }> };

const CATEGORY_LABEL = {
  appointments: "catAppointments", orders: "catOrders", health: "catHealth",
  chat: "catChat", account: "catAccount", marketing: "catMarketing",
} as const;
const CHANNEL_LABEL = { push: "chPush", email: "chEmail", sms: "chSms" } as const;

/**
 * `/settings/notifications` (merge map section 3): the one notification-preferences screen, GET and PATCH
 * /users/me/notification-settings. It absorbed the Batch 0 `/notifications/settings` (which redirects here); the theme and the
 * language that screen also held are on `/settings/language`.
 */
export default async function SettingsNotificationsPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("NotificationSettings");
  const rs = await getTranslations("RouteState");
  const token = await requirePatientAccess(locale);
  const back = `/${locale}/settings`;
  const failed = (
    <ConsultPage locale={locale} title={t("title")} backHref={back}>
      <ConsultState kind="error" title={t("unavailableTitle")} body={t("unavailable")} retryLabel={rs("retry")} />
    </ConsultPage>
  );
  let response: Response;
  try { response = await getPatientNotificationSettings(token); } catch { return failed; }
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  if (!response.ok) return failed;

  const prefs = extractNotificationPreferences(await response.json().catch(() => null));
  const categories: SwitchRow[] = NOTIFICATION_CATEGORIES.flatMap((key) => typeof prefs.categories[key] === "boolean"
    ? [{ id: `categories.${key}`, group: "categories", key, label: t(CATEGORY_LABEL[key]), value: prefs.categories[key] === true }] : []);
  const channels: SwitchRow[] = NOTIFICATION_CHANNELS.flatMap((key) => typeof prefs.channels[key] === "boolean"
    ? [{ id: `channels.${key}`, group: "channels", key, label: t(CHANNEL_LABEL[key]), value: prefs.channels[key] === true }] : []);

  return (
    <ConsultPage locale={locale} title={t("title")} backHref={back}>
      {categories.length + channels.length === 0 ? <p className={styles.hint} role="status">{t("unavailable")}</p> : null}
      {categories.length > 0 ? <Group id="categories" title={t("notifications")}><SwitchList kind="notifications" label={t("notifications")} rows={categories} /></Group> : null}
      {channels.length > 0 ? <Group id="channels" title={t("channels")}><SwitchList kind="notifications" label={t("channels")} rows={channels} /></Group> : null}
    </ConsultPage>
  );
}
