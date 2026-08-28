import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { AuthWelcome } from "@/components-next/auth-welcome";
import { isLocale } from "@/lib/i18n";

type Props = { params: Promise<{ locale: string }> };
export async function generateMetadata(): Promise<Metadata> { return { title: "Nabd Plus", robots: { index: false, follow: false } }; }
export default async function WelcomePage({ params }: Props) { const { locale } = await params; if (!isLocale(locale)) notFound(); setRequestLocale(locale); return <AuthWelcome locale={locale}/>; }
