import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isLocale, locales } from "@/lib/i18n";
import { localizedUrl } from "@/lib/seo";
import { LabsCatalog } from "@/components-next/diagnostics/labs-catalog";
import type { Metadata } from "next";

type Props = { params: Promise<{ locale: string }>; searchParams?: Promise<{ q?: string; home?: string }> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "LabsServices" });
  const canonical = localizedUrl(locale, "/diagnostics/labs");
  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: {
      canonical,
      languages: { ...Object.fromEntries(locales.map((l) => [l, localizedUrl(l, "/diagnostics/labs")])), "x-default": localizedUrl("ar", "/diagnostics/labs") },
    },
    openGraph: { type: "website", url: canonical, title: t("title"), description: t("subtitle"), siteName: "Nabd Plus", images: [{ url: `${process.env.NEXT_PUBLIC_SITE_ORIGIN || "https://nabd.plus"}/images/labs/comprehensive-checkup.jpg`, alt: t("title") }] },
    twitter: { card: "summary_large_image", title: t("title"), description: t("subtitle") },
    robots: { index: true, follow: true },
  };
}

export default async function LabsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const query = (await searchParams) ?? {};
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  return <LabsCatalog locale={locale} search={(query.q ?? "").trim()} homeOnly={query.home === "1"} backHref={`/${locale}/diagnostics`} />;
}
