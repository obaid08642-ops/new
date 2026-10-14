import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { getPatientSecuritySettings, getPatientSessions } from "@/lib/api/settings-server";
import { parseOwnSessions, parseSecuritySettings } from "@/lib/api/settings";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { Notice } from "@/components-next/consult/consult-parts";
import { FlushCard, Group } from "@/components-next/settings/settings-kit";
import { SessionList } from "@/components-next/settings/session-list";
import { StatusChip } from "@/components-next/ui-generated/components/Controls";
import { OFFER_TONES } from "@/components-next/pharmacy-offers/tones";
import styles from "@/components-next/settings/settings.module.css";

type Props = { params: Promise<{ locale: string }> };

/**
 * `/settings/security` (merge map section 3): the security settings the server reports (biometric sign-in, two-factor;
 * read-only here) and the active sessions, each with a sign-out. A failed sessions read is said in place; the screen needs
 * the settings themselves.
 */
export default async function SettingsSecurityPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("SettingsWeb");
  const rs = await getTranslations("RouteState");
  const token = await requirePatientAccess(locale);
  const [securityResponse, sessionsResponse] = await Promise.all([getPatientSecuritySettings(token), getPatientSessions(token)]);
  if (securityResponse.status === 401 || sessionsResponse.status === 401) redirect(`/${locale}/login`);
  if (securityResponse.status === 403 || securityResponse.status === 404) notFound();
  const back = `/${locale}/settings`;
  if (!securityResponse.ok) {
    return (
      <ConsultPage locale={locale} title={t("securityTitle")} backHref={back}>
        <ConsultState kind="error" title={t("unavailableTitle")} body={t("unavailable")} retryLabel={rs("retry")} />
      </ConsultPage>
    );
  }
  const security = parseSecuritySettings(await securityResponse.json().catch(() => null));
  const sessions = sessionsResponse.ok ? parseOwnSessions(await sessionsResponse.json().catch(() => null)) : null;
  const chip = (value?: boolean) => value === undefined
    ? <StatusChip label={t("notAvailable")} tone="ink" />
    : <StatusChip label={value ? t("enabled") : t("disabled")} tone={value ? OFFER_TONES.good : "ink"} />;

  return (
    <ConsultPage locale={locale} title={t("securityTitle")} backHref={back}>
      <FlushCard label={t("securityTitle")}>
        <div className={styles.itemRow}>
          <span className={styles.itemText}>
            <span className={styles.itemTitle}>{t("biometric")}</span>
            <span className={styles.itemSub}>{t("biometricSub")}</span>
          </span>
          {chip(security.biometric)}
        </div>
        <div className={styles.itemRow}>
          <span className={styles.itemText}>
            <span className={styles.itemTitle}>{t("twoFactor")}</span>
            <span className={styles.itemSub}>{t("twoFactorSub")}</span>
          </span>
          {chip(security.twoFactor)}
        </div>
      </FlushCard>
      <Notice>{t("securityNote")}</Notice>
      <Group id="sessions" title={t("sessionsTitle")}>
        {sessions === null ? <Notice warn>{t("sessionsUnavailable")}</Notice>
          : sessions.length === 0 ? <p className={styles.hint} role="status">{t("sessionsEmpty")}</p>
          : <SessionList sessions={sessions} />}
      </Group>
    </ConsultPage>
  );
}
