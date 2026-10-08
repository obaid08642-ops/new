import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import { redirectKeepingQuery } from "@/lib/redirect-keep-query";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

/** Parity with app diagnostics/upload-rx: legacy route, the prescription upload is the photo way in of pharmacy/rx-order. The query is kept. */
export default async function DiagnosticsUploadRxPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  redirectKeepingQuery(`/${locale}/pharmacy/rx-order`, await searchParams, { via: "photo" });
}
