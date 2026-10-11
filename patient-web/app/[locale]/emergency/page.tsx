import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";
import { parseUrgentHelp } from "@/lib/api/urgent-help";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { ActionLinks, Hero, Notice } from "@/components-next/consult/consult-parts";
import { SERVICE_ICONS } from "@/components-next/ui-generated/icons/fill";

type Props = { params: Promise<{ locale: string }> };
const URGENT = SERVICE_ICONS.emergency;

/**
 * The one urgent-help screen (owner decision 14, 2026-10-10; same content as the app's /emergency): a calm page with a `tel:`
 * button whose number is the one the admin set (GET /mental-health/urgent-help, public, key `mental_health_urgent_help`).
 * No number is written in the code: without one there is no button and the page says so. No ambulance, no location sharing,
 * no crisis handling. The old /emergency/sos, /sos-active and /tracking routes redirect here.
 */
export default async function EmergencyPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requirePatientAccess(locale);
  const t = await getTranslations("Emergency");
  const rs = await getTranslations("RouteState");

  const response = await callPatientApi("/mental-health/urgent-help");
  const help = response.ok ? parseUrgentHelp(await response.json().catch(() => null)) : null;
  const failed = !response.ok;

  return (
    <ConsultPage locale={locale} title={t("title")} backHref={`/${locale}/dashboard`}>
      <Hero icon={URGENT.icon} tone={URGENT.tone} title={t("title")} sub={t("intro")} />
      {failed ? (
        <ConsultState kind="error" title={t("loadError")} retryLabel={rs("retry")} />
      ) : help ? (
        <ActionLinks actions={[{ href: `tel:${help.dial}`, label: t("call", { number: `⁦${help.phone}⁩` }), variant: "primary", external: true }]} />
      ) : (
        <Notice warn>{t("unavailable")}</Notice>
      )}
      <Notice>{t("note")}</Notice>
    </ConsultPage>
  );
}
