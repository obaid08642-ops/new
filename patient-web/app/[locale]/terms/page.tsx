import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { LegalTerms } from "@/components-next/legal-terms";
import { isLocale } from "@/lib/i18n";

type Props={params:Promise<{locale:string}>};
export const metadata: Metadata={title:"شروط الاستخدام | نبض بلس",robots:{index:false,follow:false}};
export default async function TermsPage({params}:Props){const {locale}=await params;if(!isLocale(locale))notFound();setRequestLocale(locale);return <LegalTerms locale={locale}/>;}
