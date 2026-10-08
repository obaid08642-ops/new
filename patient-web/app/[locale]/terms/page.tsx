import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LegalDocument } from "@/components-next/landing/legal-document";
import { readLegalPolicy } from "@/lib/api/legal-policy";
import { isLocale } from "@/lib/i18n";
import { hubMetadata } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "HubSeo" });
  return hubMetadata(locale, "/terms", t("terms.title"), t("terms.description"));
}

export default async function TermsPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const policy = await readLegalPolicy("patient_terms", locale);
  if (!policy?.content) notFound();
  return <LegalDocument locale={locale} kind="terms" policy={policy} />;
}
