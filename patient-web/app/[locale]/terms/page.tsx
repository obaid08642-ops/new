import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LegalTerms } from "@/components-next/legal-terms";
import { isLocale } from "@/lib/i18n";
import { hubMetadata } from "@/lib/seo";


type Props={params:Promise<{locale:string}>};
export const metadata: Metadata={title:"شروط الاستخدام | نبض بلس",robots:{index:false,follow:false}};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "HubSeo" });
  return hubMetadata(locale, "/terms", t("terms.title"), t("terms.description"));
}

export default async function TermsPage({params}:Props){const {locale}=await params;if(!isLocale(locale))notFound();setRequestLocale(locale);return <LegalTerms locale={locale}/>;}
