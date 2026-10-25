import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getOptionalPatientAccessToken } from "@/lib/auth/session";
import { signInHref } from "@/lib/services/guest";
import { GuestAction } from "@/components-next/guest/guest-service";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";
import { parseUrgentHelp } from "@/lib/api/urgent-help";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ActionLinks, Hero, Notice } from "@/components-next/consult/consult-parts";
import { SERVICE_ICONS } from "@/components-next/ui-generated/icons/fill";
import { ShareLocation } from "@/components-next/emergency/share-location";

type Props = { params: Promise<{ locale: string }> };
const URGENT = SERVICE_ICONS.emergency;
/** The national emergency number (owner decision 14: the emergency button opens the dialer with 997). Always offered; the admin's urgent-help line, when set, comes after it. */
const EMERGENCY_NUMBER = "997";

/**
 * The one urgent-help screen (owner decision 14, 2026-10-10; same content as the app's /emergency): a calm page with a `tel:997`
 * button that is always there, then a second `tel:` button for the number the admin set (GET /mental-health/urgent-help, public,
 * key `mental_health_urgent_help`) when there is one and it is not 997. "Send my location to my family"
 * (decision 14) shares the position with the patient's own emergency contacts. No ambulance, no dispatch, no crisis handling.
 * The old /emergency/sos, /sos-active and /tracking routes redirect here.
 * Issue 1550: the number never sits behind the sign-in. A guest gets the same call button (the read is public and carries no
 * credential); only sending the location, which goes to the patient's own contacts, asks for the sign-in and comes back here.
 */
export default async function EmergencyPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const signedIn = Boolean(await getOptionalPatientAccessToken());
  const t = await getTranslations("Emergency");
  const g = await getTranslations("GuestServices");

  // Without the admin's line (error or none set) the page still offers 997 and the share action.
  const response = await callPatientApi("/mental-health/urgent-help").catch(() => null);
  const help = response?.ok ? parseUrgentHelp(await response.json().catch(() => null)) : null;

  return (
    <ConsultPage locale={locale} title={t("title")} backHref={signedIn ? `/${locale}/dashboard` : `/${locale}`}>
      <Hero icon={URGENT.icon} tone={URGENT.tone} title={t("title")} sub={t("intro")} />
      <ActionLinks
        actions={[
          { href: `tel:${EMERGENCY_NUMBER}`, label: t("call", { number: `⁦${EMERGENCY_NUMBER}⁩` }), variant: "primary", external: true },
          ...(help && help.dial !== EMERGENCY_NUMBER ? [{ href: `tel:${help.dial}`, label: t("call", { number: `⁦${help.phone}⁩` }), variant: "outline" as const, external: true }] : []),
        ]}
      />
      {signedIn ? (
        <ShareLocation />
      ) : (
        <GuestAction id="emergency-sign-in" title={t("share")} body={g("emergency.shareBody")} label={g("emergency.shareAction")} href={signInHref(locale, `/${locale}/emergency`)} />
      )}
      <Notice>{t("note")}</Notice>
    </ConsultPage>
  );
}
