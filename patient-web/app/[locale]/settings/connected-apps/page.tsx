import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";
import { parseAgentConnections } from "@/lib/api/agent-connections";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { Notice } from "@/components-next/consult/consult-parts";
import { ConnectedApps } from "@/components-next/settings/connected-apps";

type Props = { params: Promise<{ locale: string }> };

/** `/settings/connected-apps` (ac-1-agent-oauth#1): the AI assistants the patient connected, and disconnecting one. */
export default async function ConnectedAppsPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("SettingsWeb");
  const rs = await getTranslations("RouteState");
  const token = await requirePatientAccess(locale);
  const response = await callPatientApi("/patient/agent-connections", {}, token);
  if (response.status === 401) redirect(`/${locale}/login`);
  const back = `/${locale}/settings`;
  if (!response.ok) {
    return (
      <ConsultPage locale={locale} title={t("connectedAppsTitle")} backHref={back}>
        <ConsultState kind="error" title={t("unavailableTitle")} body={t("unavailable")} retryLabel={rs("retry")} />
      </ConsultPage>
    );
  }
  const connections = parseAgentConnections(await response.json().catch(() => null));
  return (
    <ConsultPage locale={locale} title={t("connectedAppsTitle")} backHref={back}>
      {connections.length ? <ConnectedApps connections={connections} locale={locale} /> : <ConsultState kind="empty" title={t("connectedAppsEmptyTitle")} body={t("connectedAppsEmpty")} />}
      <Notice>{t("connectedAppsNote")}</Notice>
    </ConsultPage>
  );
}
