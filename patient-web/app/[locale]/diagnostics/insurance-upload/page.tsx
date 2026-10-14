import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import { redirectKeepingQuery } from "@/lib/redirect-keep-query";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

/** Merged into diagnostics/insurance-approval (second pass, section 2): the document upload is a section of the booking's insurance step. `bookingId` becomes `orderId`; the rest of the query is kept. */
export default async function DiagnosticsInsuranceUploadPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const sp = await searchParams;
  const { bookingId, ...rest } = sp;
  const id = Array.isArray(bookingId) ? bookingId[0] : bookingId;
  redirectKeepingQuery(`/${locale}/diagnostics/insurance-approval`, rest, id ? { orderId: id } : {});
}
