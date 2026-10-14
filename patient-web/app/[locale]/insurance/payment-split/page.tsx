import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import { insuranceRequestHref } from "@/lib/insurance/redirect";
import { UUID } from "@/lib/insurance/view";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ request_id?: string; requestId?: string }> };

/** Merge map 2, section 6: the payment split is the one request page (`/insurance/requests/<id>`), which reads the same record. */
export default async function InsurancePaymentSplitRedirect({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  const requestId = (sp.request_id || sp.requestId || "").trim();
  if (!isLocale(locale) || !UUID.test(requestId)) notFound();
  redirect(insuranceRequestHref(locale, requestId));
}
