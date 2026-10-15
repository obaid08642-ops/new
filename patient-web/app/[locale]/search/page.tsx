import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { isLocale } from "@/lib/i18n";
import { truncateQuery } from "@/lib/api/search";
import { SearchClient } from "./search-client";

type Props = { params: Promise<{ locale: string }>; searchParams?: Promise<{ q?: string | string[] }> };

export default async function SearchPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  // issue 439: the search is public (the Home box and its SearchAction send signed-out visitors here); GET /search is @Public
  // The home search box sends ?q=: the field starts with it and the search runs.
  const q = (await searchParams)?.q;
  const initialQuery = truncateQuery((Array.isArray(q) ? q[0] : q) ?? "").trim();
  return <SearchClient locale={locale} initialQuery={initialQuery} />;
}
