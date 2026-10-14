import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { callPatientApi } from "@/lib/api/upstream";
import { extractRecord } from "@/lib/api/profile";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { ButtonLink } from "@/components-next/pharmacy/button-link";
import { AccountSummary, profileIdentity } from "@/components-next/account/account-summary";
import { NavRows } from "@/components-next/settings/settings-kit";

type Props = { params: Promise<{ locale: string }> };

/**
 * `/settings`, the hub (merge map section 3): the account summary and the list of sections. It has no content of its own
 * besides the summary; privacy, security, sessions and storage are read by their own screens.
 */
export default async function SettingsHubPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("SettingsWeb");
  const rs = await getTranslations("RouteState");
  const token = await requirePatientAccess(locale);
  const response = await callPatientApi("/auth/me", {}, token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  const back = `/${locale}/profile`;
  if (!response.ok) {
    return (
      <ConsultPage locale={locale} title={t("hubTitle")} backHref={back}>
        <ConsultState kind="error" title={t("unavailableTitle")} body={t("unavailable")} retryLabel={rs("retry")} />
      </ConsultPage>
    );
  }
  const identity = profileIdentity(extractRecord(await response.json().catch(() => null)));
  const base = `/${locale}/settings`;

  return (
    <ConsultPage locale={locale} title={t("hubTitle")} backHref={back}>
      <AccountSummary
        label={t("hubAccount")}
        name={identity.name || t("hubAccountFallback")}
        lines={identity.lines}
        action={<ButtonLink href={`/${locale}/profile`} label={t("hubViewProfile")} variant="outline" size="sm" />}
      />
      <NavRows
        locale={locale}
        label={t("hubSections")}
        rows={[
          { href: `${base}/notifications`, icon: "bell", tone: "coral", title: t("rowNotifications"), sub: t("rowNotificationsSub") },
          { href: `${base}/privacy`, icon: "key", tone: "violet", title: t("rowPrivacy"), sub: t("rowPrivacySub") },
          { href: `${base}/security`, icon: "shield-check", tone: "teal", title: t("rowSecurity"), sub: t("rowSecuritySub") },
          { href: `${base}/language`, icon: "translate", tone: "blue", title: t("rowLanguage"), sub: t("rowLanguageSub") },
          { href: `${base}/help`, icon: "headset", tone: "mint", title: t("rowHelp"), sub: t("rowHelpSub") },
          { href: `${base}/about`, icon: "info", tone: "ink", title: t("rowAbout"), sub: t("rowAboutSub") },
        ]}
      />
    </ConsultPage>
  );
}
