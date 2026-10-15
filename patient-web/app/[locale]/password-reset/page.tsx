import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthLayout } from "@/components-next/auth/auth-layout";
import { PasswordResetForm } from "@/components-next/password-reset-form";
import { isLocale } from "@/lib/i18n";

type Props = { params: Promise<{ locale: string }>; searchParams?: Promise<{ token?: string | string[] }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return { title: t("passwordResetTitle"), robots: { index: false, follow: false } };
}
/** The sign-in family's layout (boards Login / AuthWeb). */
export default async function Page({ params, searchParams }: Props) {
  const { locale } = await params;
  // 435: the reset e-mail links here with ?token=...; the form starts with it filled in.
  const raw = (await searchParams)?.token;
  const token = (Array.isArray(raw) ? raw[0] : raw)?.slice(0, 256) ?? "";
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  return <AuthLayout locale={locale} backHref={`/${locale}/login`}><PasswordResetForm locale={locale} initialToken={token} /></AuthLayout>;
}
