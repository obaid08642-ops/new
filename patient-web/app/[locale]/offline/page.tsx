import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isLocale, locales } from "@/lib/i18n";
import { RouteState } from "@/components-next/core/route-state";

type Props = { params: Promise<{ locale: string }> };

// journeys#77: the page the service worker (public/sw.js) shows when a page cannot be loaded offline. Static, no data.
export const dynamic = "force-static";
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: isLocale(locale) ? locale : "ar", namespace: "Offline" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function OfflinePage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Offline" });
  return <RouteState kind="not-found" locale={locale} title={t("title")} body={t("body")} primaryLabel={t("home")} returnHomeLabel={t("home")} />;
}
