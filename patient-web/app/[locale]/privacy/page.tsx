import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { LegalPrivacy } from "@/components-next/legal-terms";
import { isLocale } from "@/lib/i18n";

type Props={params:Promise<{locale:string}>};
export const metadata: Metadata={title:"سياسة الخصوصية (PDPL) | نبض بلس",robots:{index:false,follow:false}};
export default async function PrivacyPage({params}:Props){const {locale}=await params;if(!isLocale(locale))notFound();setRequestLocale(locale);return <LegalPrivacy locale={locale}/>;}
