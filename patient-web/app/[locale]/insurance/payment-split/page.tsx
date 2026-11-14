import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { callPatientApi } from "@/lib/api/upstream";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { insuranceRequestHref } from "@/lib/insurance/redirect";
import { parseRequestRows, UUID } from "@/lib/insurance/view";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ request_id?: string; requestId?: string }> };

/**
 * Merge map 2, section 6: the payment split is the one request page (`/insurance/requests/<id>`), which reads the same record.
 * Without a request id (the old link from the hub), it opens the newest request, as the approval wait does; a malformed id
 * is still a 404.
 */
export default async function InsurancePaymentSplitRedirect({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const requestId = (sp.request_id || sp.requestId || "").trim();
  // A given id must be a request id (a malformed one is still a 404); only a missing id opens the newest request.
  if (requestId) {
    if (!UUID.test(requestId)) notFound();
    redirect(insuranceRequestHref(locale, requestId));
  }
  const token = await requirePatientAccess(locale);
  let target = `/${locale}/insurance`;
  try {
    const response = await callPatientApi("/insurance/requests/my", {}, token);
    if (response.status === 401) target = `/${locale}/login`;
    else if (response.ok) {
      const newest = parseRequestRows(await response.json().catch(() => null))[0];
      if (newest) target = insuranceRequestHref(locale, newest.id);
    }
  } catch {
    /* the hub lists the requests */
  }
  redirect(target);
}
