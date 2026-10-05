import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { AuthLayout } from "@/components-next/auth/auth-layout";
import { ForgotPasswordForm } from "@/components-next/forgot-password-form";
import { isLocale } from "@/lib/i18n";

type Props = { params: Promise<{ locale: string }> };
export const metadata: Metadata = { title: "Nabd Plus", robots: { index: false, follow: false } };
/** The sign-in family's layout (boards Login / AuthWeb). */
export default async function Page({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  return <AuthLayout locale={locale} backHref={`/${locale}/login`}><ForgotPasswordForm locale={locale} /></AuthLayout>;
}
