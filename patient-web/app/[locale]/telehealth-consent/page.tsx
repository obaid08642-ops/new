import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LegalDocument } from "@/components-next/landing/legal-document";
import { readLegalPolicyOrEmbedded } from "@/lib/legal/embedded";
import { isLocale } from "@/lib/i18n";
import { hubMetadata } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "HubSeo" });
  return hubMetadata(locale, "/telehealth-consent", t("telehealthConsent.title"), t("telehealthConsent.description"));
}

/** D-38: the telehealth consent (`telehealth_consent` of the legal service), accepted before the first online consultation. */
export default async function TelehealthConsentPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const policy = await readLegalPolicyOrEmbedded("telehealth_consent", locale);
  if (!policy?.content) notFound();
  return <LegalDocument locale={locale} kind="telehealth" policy={policy} />;
}
