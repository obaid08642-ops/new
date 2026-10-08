import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { isLocale } from "@/lib/i18n";
import { redirectKeepingQuery } from "@/lib/redirect-keep-query";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

/** The plan is a tab of the nutrition hub; it stays hidden until GET /nutrition/plan exists, and the hub then opens Today. */
export default async function Page({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  redirectKeepingQuery(`/${locale}/nutrition`, await searchParams, {"tab": "plan"});
}
