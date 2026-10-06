import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { isLocale, type Locale } from "@/lib/i18n";
import { LocaleSelector } from "@/components-next/locale-selector";

type Props = { params: Promise<{ locale: string }> };

/** Parity with app onboarding/language: choose language then permissions step. */
export default async function OnboardingLanguagePage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const ar = locale === "ar";
  return (
    <main className="main">
      <h1>{ar ? "اختر لغتك" : "Choose your language"}</h1>
      <p>{ar ? "اضبط لغة التطبيق — يمكنك تغييرها لاحقاً من الإعدادات." : "Set the app language — you can change it later in settings."}</p>
      <LocaleSelector current={locale as Locale} label={ar ? "اللغة" : "Language"} />
      <nav style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Link href={`/${locale}/onboarding/permissions`}>{ar ? "متابعة" : "Continue"}</Link>
      </nav>
    </main>
  );
}
