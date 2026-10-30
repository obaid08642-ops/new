import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/lib/i18n";

type Props = { params: Promise<{ locale: string }>; searchParams?: Promise<{ tab?: string }> };

/** Merged into "My orders and results": the lab and radiology requests are rows of its current and previous tabs. */
export default async function DiagnosticsBookingsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const previous = (await searchParams)?.tab === "previous";
  redirect(`/${locale}/orders${previous ? "?tab=previous" : ""}`);
}
