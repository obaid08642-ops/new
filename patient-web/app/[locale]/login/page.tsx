import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthLayout } from "@/components-next/auth/auth-layout";
import { LoginForm } from "@/components-next/login-form";
import { isLocale } from "@/lib/i18n";

type Props = { params: Promise<{ locale: string }>; searchParams?: Promise<{ guest?: string | string[] }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return { title: t("loginTitle"), robots: { index: false, follow: false } };
}

/** Boards Login (phone) and AuthWeb (desktop). */
export default async function LoginPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  // /welcome sends a failed guest start here with ?guest=blocked: the form says so.
  const guestBlocked = (await searchParams)?.guest === "blocked";
  return (
    <AuthLayout locale={locale} backHref={`/${locale}/welcome`}>
      <LoginForm locale={locale} guestBlocked={guestBlocked} />
    </AuthLayout>
  );
}
