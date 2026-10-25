import { getTranslations } from "next-intl/server";
import { callPatientApi } from "@/lib/api/upstream";
import { parseUrgentHelp } from "@/lib/api/urgent-help";
import { Notice } from "@/components-next/consult/consult-parts";
import { CallLink, EMERGENCY_NUMBER } from "./call-link";

/**
 * "Urgent help" on the mental-health page (owner decision 8): calls the number the admin set (GET /mental-health/urgent-help, public).
 * No number is written in the code. The call to the emergency number (997) is always shown; without the admin's number a note says it is missing.
 */
export async function UrgentCall() {
  const t = await getTranslations("Emergency");
  const response = await callPatientApi("/mental-health/urgent-help").catch(() => null);
  const help = response?.ok ? parseUrgentHelp(await response.json().catch(() => null)) : null;
  // owner decision 14 (2026-10-25): the 997 button is ALWAYS there; the admin's number is an extra button only when known
  return (
    <>
      {help ? <CallLink dial={help.dial} label={t("urgentCall", { number: `⁦${help.phone}⁩` })} /> : <Notice warn>{t("urgentUnavailable")}</Notice>}
      <CallLink dial={EMERGENCY_NUMBER} label={t("callEmergency", { number: EMERGENCY_NUMBER })} />
    </>
  );
}
