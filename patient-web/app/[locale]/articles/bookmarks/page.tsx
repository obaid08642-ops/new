import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/lib/i18n";

type Props = { params: Promise<{ locale: string }> };

/** Saved articles are the Saved tab of the articles list (merge map, Batch 10). */
export default async function ArticleBookmarksRedirect({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  redirect(`/${locale}/articles?tab=saved`);
}
