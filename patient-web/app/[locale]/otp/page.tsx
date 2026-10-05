import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { AuthLayout } from "@/components-next/auth/auth-layout";
import { OtpScreen } from "@/components-next/otp-screen";
import { isLocale } from "@/lib/i18n";

type Props = { params: Promise<{ locale: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return { title: locale === "ar" ? "رمز التأكيد | نبض بلس" : "Verification code | Nabd Plus", robots: { index: false, follow: false } };
}
/** Board Otp (phone) and AuthWeb (desktop). */
export default async function OtpPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  return <AuthLayout locale={locale} backHref={`/${locale}/login`}><OtpScreen locale={locale} /></AuthLayout>;
}
