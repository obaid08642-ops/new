import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { AuthLayout } from "@/components-next/auth/auth-layout";
import { RegisterForm } from "@/components-next/register-form";
import { isLocale } from "@/lib/i18n";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: locale === "ar" ? "إنشاء حساب | نبض بلس" : "Create account | Nabd Plus", robots: { index: false, follow: false } };
}

/** Board Register (phone) and AuthWeb (desktop). */
export default async function RegisterPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  return (
    <AuthLayout locale={locale} backHref={`/${locale}/login`}>
      <RegisterForm locale={locale} />
    </AuthLayout>
  );
}
