import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthLayout } from "@/components-next/auth/auth-layout";
import { OtpScreen } from "@/components-next/otp-screen";
import { otpIdentifierCookie } from "@/lib/auth/cookies";
import { isLocale } from "@/lib/i18n";

type Props = { params: Promise<{ locale: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return { title: t("otpTitle"), robots: { index: false, follow: false } };
}
/** Board Otp (phone) and AuthWeb (desktop). Where the code went comes from the cookie /api/auth/register set, not from the URL. */
export default async function OtpPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const identifier = (await cookies()).get(otpIdentifierCookie)?.value ?? "";
  return <AuthLayout locale={locale} backHref={`/${locale}/login`}><OtpScreen locale={locale} identifier={identifier} /></AuthLayout>;
}
