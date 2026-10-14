import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { callPatientApi } from "@/lib/api/upstream";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { insuranceRequestHref } from "@/lib/insurance/redirect";
import { parseRequestRows } from "@/lib/insurance/view";

type Props = { params: Promise<{ locale: string }> };

/**
 * Merge map 2, section 6: the co-pay is the state COPAY_PENDING of the one request page. This page chose the newest request
 * waiting for its co-pay from GET /insurance/requests/my; it still does, and opens that request. With none, the hub (which lists
 * the requests) opens. The amount in the old URL is not carried: the page shows the server's amount.
 */
export default async function InsuranceCopayRedirect({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const token = await requirePatientAccess(locale);
  let target = `/${locale}/insurance`;
  try {
    const response = await callPatientApi("/insurance/requests/my", {}, token);
    if (response.status === 401) target = `/${locale}/login`;
    else if (response.ok) {
      const pending = parseRequestRows(await response.json().catch(() => null)).find((row) => row.state === "COPAY_PENDING");
      if (pending) target = insuranceRequestHref(locale, pending.id);
    }
  } catch {
    /* the hub lists the requests */
  }
  redirect(target);
}
