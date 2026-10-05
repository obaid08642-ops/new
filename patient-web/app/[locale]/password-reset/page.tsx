import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthLayout } from "@/components-next/auth/auth-layout";
import { PasswordResetForm } from "@/components-next/password-reset-form";
import { isLocale } from "@/lib/i18n";

type Props = { params: Promise<{ locale: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return { title: t("passwordResetTitle"), robots: { index: false, follow: false } };
}
/** The sign-in family's layout (boards Login / AuthWeb). */
export default async function Page({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  return <AuthLayout locale={locale} backHref={`/${locale}/login`}><PasswordResetForm locale={locale} /></AuthLayout>;
}
