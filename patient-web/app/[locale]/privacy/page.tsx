import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LegalDocument } from "@/components-next/landing/legal-document";
import { readLegalPolicy } from "@/lib/api/legal-policy";
import { isLocale } from "@/lib/i18n";
import { hubMetadata } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }> };

// F82-3: static/ISR. The policy text is public and the same for everyone: no cookie, no header, no search parameter. A failed
// read throws (lib/api/public-read.ts), so Next keeps the last good copy; a missing policy is a 404.
export const revalidate = 3600;
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "HubSeo" });
  return hubMetadata(locale, "/privacy", t("privacy.title"), t("privacy.description"));
}

export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const policy = await readLegalPolicy("privacy_policy", locale);
  if (!policy?.content) notFound();
  return <LegalDocument locale={locale} kind="privacy" policy={policy} />;
}
