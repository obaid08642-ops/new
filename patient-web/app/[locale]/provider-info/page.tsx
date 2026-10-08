import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isLocale } from "@/lib/i18n";
import { hubMetadata } from "@/lib/seo";
import { LandingPage } from "@/components-next/landing/landing-kit";
import { ActionLinks } from "@/components-next/consult/consult-parts";

type Props = { params: Promise<{ locale: string }> };

// F82-3: static. No data and nothing of the reader in the page: the same HTML for everyone.
export const revalidate = 3600;
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "HubSeo" });
  return hubMetadata(locale, "/provider-info", t("provider-info.title"), t("provider-info.description"));
}

export default async function ProviderInfoPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("PublicLanding");

  return (
    <LandingPage locale={locale} title={t("provider.title")} intro={t("provider.body")} backHref={`/${locale}/login`}>
      <ActionLinks
        actions={[
          { href: `/${locale}/login`, label: t("provider.continue") },
          { href: `/${locale}/support`, label: t("provider.contact"), variant: "outline" },
        ]}
      />
    </LandingPage>
  );
}
