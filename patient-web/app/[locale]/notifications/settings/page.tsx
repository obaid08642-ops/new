import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPatientNotificationSettings } from "@/lib/api/notification-settings-server";
import { extractNotificationPreferences, NOTIFICATION_CATEGORIES, NOTIFICATION_CHANNELS } from "@/lib/api/notification-settings";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { CoreShell } from "@/components-next/core/core-shell";
import core from "@/components-next/core/core.module.css";
import { RetryErrorState } from "@/components-next/core/core-states";
import { NotificationSettingsClient, type SettingRow } from "./notification-settings-client";
import styles from "./settings.module.css";

type Props = { params: Promise<{ locale: string }> };

const CATEGORY_LABEL = {
  appointments: "catAppointments", orders: "catOrders", health: "catHealth",
  chat: "catChat", account: "catAccount", marketing: "catMarketing",
} as const;
const CHANNEL_LABEL = { push: "chPush", email: "chEmail", sms: "chSms" } as const;

export default async function NotificationSettingsPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Notifications");
  const s = await getTranslations("NotificationSettings");
  const routeState = await getTranslations("RouteState");
  const token = await requirePatientAccess(locale);
  const back = `/${locale}/notifications`;
  const failed = (
    <CoreShell locale={locale} title={s("title")} backHref={back} width="narrow">
      <RetryErrorState title={s("unavailableTitle")} body={s("unavailable")} retryLabel={routeState("retry")} />
    </CoreShell>
  );
  let response: Response;
  try { response = await getPatientNotificationSettings(token); } catch { return failed; }
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  if (!response.ok) return failed;

  const prefs = extractNotificationPreferences(await response.json().catch(() => null));
  const rows: SettingRow[] = [
    ...NOTIFICATION_CATEGORIES.flatMap((key) => typeof prefs.categories[key] === "boolean" ? [{ group: "categories" as const, key, label: s(CATEGORY_LABEL[key]), value: prefs.categories[key] === true }] : []),
    ...NOTIFICATION_CHANNELS.flatMap((key) => typeof prefs.channels[key] === "boolean" ? [{ group: "channels" as const, key, label: s(CHANNEL_LABEL[key]), value: prefs.channels[key] === true }] : []),
  ];

  return (
    <CoreShell locale={locale} title={s("title")} backHref={back} width="narrow">
      <h1 className={`${core.deskOnly} ${styles.deskTitle}`}>{s("title")}</h1>
      <NotificationSettingsClient
        locale={locale}
        rows={rows}
        labels={{
          appearance: s("appearance"), appearanceAuto: s("appearanceAuto"), appearanceLight: s("appearanceLight"), appearanceDark: s("appearanceDark"),
          appearanceHint: s("appearanceHint"), language: s("language"), notifications: s("notifications"), channels: s("channels"),
          saveFailed: s("saveFailed"), unavailable: s("unavailable"),
        }}
      />
    </CoreShell>
  );
}
