import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { isLocale } from "@/lib/i18n";

type Props = { params: Promise<{ locale: string }> };

/** Parity with app diagnostics/book-sample: legacy entrypoint, provider selection lives in the cart. */
export default async function DiagnosticsBookSamplePage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  redirect(`/${locale}/diagnostics/cart`);
}
