import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import { redirectKeepingQuery } from "@/lib/redirect-keep-query";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

/** Parity with app pharmacy/custom-item: merged into the one "order with a prescription" screen (its "type the names" way in). The query is kept. */
export default async function PharmacyCustomItemPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  redirectKeepingQuery(`/${locale}/pharmacy/rx-order`, await searchParams, { via: "type" });
}
