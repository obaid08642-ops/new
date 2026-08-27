import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { LegalPlaceholder } from "@/components-next/legal-placeholder";
import { isLocale } from "@/lib/i18n";

type Props={params:Promise<{locale:string}>};
export const metadata: Metadata={title:"Privacy | Nabd Plus",robots:{index:false,follow:false}};
export default async function PrivacyPage({params}:Props){const {locale}=await params;if(!isLocale(locale))notFound();setRequestLocale(locale);return <LegalPlaceholder locale={locale} kind="privacy"/>;}
