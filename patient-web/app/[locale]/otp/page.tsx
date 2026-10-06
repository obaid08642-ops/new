import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { OtpScreen } from "@/components-next/otp-screen";
import { isLocale } from "@/lib/i18n";

type Props = { params: Promise<{ locale: string }> };
export async function generateMetadata(): Promise<Metadata> { return { title: "Nabd Plus OTP", robots: { index: false, follow: false } }; }
export default async function OtpPage({ params }: Props) { const { locale } = await params; if (!isLocale(locale)) notFound(); setRequestLocale(locale); return <OtpScreen locale={locale}/>; }
