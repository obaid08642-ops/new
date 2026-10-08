import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { callPatientApi } from "@/lib/api/upstream";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { insuranceRequestHref } from "@/lib/insurance/redirect";
import { parseRequestRows, UUID } from "@/lib/insurance/view";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ requestId?: string; bookingId?: string }> };

/**
 * Merge map 2, section 6: the approval wait is the state PENDING_PROVIDER_REVIEW of the one request page. With `requestId` it
 * goes straight there; with only a booking (or nothing) it picks the request the way this page did, from GET /insurance/requests/my
 * (the one of the booking, else the newest), and with none it opens the hub, which lists the requests.
 */
export default async function InsuranceApprovalPendingRedirect({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const token = await requirePatientAccess(locale);
  const sp = await searchParams;
  const requestId = (sp.requestId || "").trim();
  if (requestId) {
    if (!UUID.test(requestId)) notFound();
    redirect(insuranceRequestHref(locale, requestId));
  }
  const bookingId = (sp.bookingId || "").trim();
  if (bookingId && !UUID.test(bookingId)) notFound();
  let target = `/${locale}/insurance`;
  try {
    const response = await callPatientApi("/insurance/requests/my", {}, token);
    if (response.status === 401) target = `/${locale}/login`;
    else if (response.ok) {
      const rows = parseRequestRows(await response.json().catch(() => null));
      const byBooking = bookingId ? rows.find((row) => row.bookingId === bookingId) : undefined;
      const pick = byBooking ?? rows[0];
      if (pick) target = insuranceRequestHref(locale, pick.id);
    }
  } catch {
    /* the hub lists the requests */
  }
  redirect(target);
}
