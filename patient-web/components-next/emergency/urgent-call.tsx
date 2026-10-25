import { getTranslations } from "next-intl/server";
import { callPatientApi } from "@/lib/api/upstream";
import { parseUrgentHelp } from "@/lib/api/urgent-help";
import { Notice } from "@/components-next/consult/consult-parts";
import { CallLink, EMERGENCY_NUMBER } from "./call-link";

/**
 * "Urgent help" on the mental-health page (owner decision 8): calls the number the admin set (GET /mental-health/urgent-help, public).
 * No number is written in the code. Without one the button is replaced by a note and the call to the emergency number (997).
 */
export async function UrgentCall() {
  const t = await getTranslations("Emergency");
  const response = await callPatientApi("/mental-health/urgent-help").catch(() => null);
  const help = response?.ok ? parseUrgentHelp(await response.json().catch(() => null)) : null;
  if (help) return <CallLink dial={help.dial} label={t("urgentCall", { number: `⁦${help.phone}⁩` })} />;
  return (
    <>
      <Notice warn>{t("urgentUnavailable")}</Notice>
      <CallLink dial={EMERGENCY_NUMBER} label={t("callEmergency", { number: EMERGENCY_NUMBER })} />
    </>
  );
}
