import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PasswordResetForm } from "@/components-next/password-reset-form";
import { isLocale, type Locale } from "@/lib/i18n";

type Props={params:Promise<{locale:string}>};
export async function generateMetadata(){return {title:"Password reset",robots:{index:false,follow:false}};}
export default async function PasswordResetPage({params}:Props){const {locale}=await params;if(!isLocale(locale))notFound();setRequestLocale(locale);await getTranslations("Login");return <main className="auth-page"><PasswordResetForm locale={locale as Locale}/></main>}
