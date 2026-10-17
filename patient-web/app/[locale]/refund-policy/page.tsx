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
  return hubMetadata(locale, "/refund-policy", t("refundPolicy.title"), t("refundPolicy.description"));
}

/** D-38: the cancellation and refund policy (`refund_policy` of the legal service), linked from the footer, the checkout and the returns. */
export default async function RefundPolicyPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const policy = await readLegalPolicyOrEmbedded("refund_policy", locale);
  if (!policy?.content) notFound();
  return <LegalDocument locale={locale} kind="refund" policy={policy} />;
}
