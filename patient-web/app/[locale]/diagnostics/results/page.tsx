import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/lib/i18n";

type Props = { params: Promise<{ locale: string }> };

/** Merged into "My orders and results" (merge map 2, owner decision 5): the ready results are its "results and reports" tab. */
export default async function DiagnosticsResultsPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  redirect(`/${locale}/orders?tab=results`);
}
