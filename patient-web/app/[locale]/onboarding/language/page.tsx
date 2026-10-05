import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { AuthLayout } from "@/components-next/auth/auth-layout";
import { Button } from "@/components-next/ui-generated/components/Button";
import { isLocale, localeLabels, locales } from "@/lib/i18n";
import styles from "@/components-next/auth/auth.module.css";

type Props = { params: Promise<{ locale: string }> };

/** Choose the language, then the permissions step (parity with app onboarding/language). */
export default async function OnboardingLanguagePage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const ar = locale === "ar";
  return (
    <AuthLayout locale={locale} backHref={`/${locale}/onboarding`}>
      <div className={styles.heading}>
        <h1 className={styles.title}>{ar ? "اختر لغتك" : "Choose your language"}</h1>
        <p className={styles.subtitle}>{ar ? "يمكنك تغييرها لاحقًا من الإعدادات." : "You can change it later in settings."}</p>
      </div>
      <div className={styles.form}>
        <nav className={styles.rows} aria-label={ar ? "اللغة" : "Language"}>
          {locales.map((l) => (
            <Link key={l} href={`/${l}/onboarding/language`} hrefLang={l} lang={l} className={`${styles.row} ${l === locale ? styles.rowOn : ""}`} aria-current={l === locale ? "true" : undefined}>
              <span>{localeLabels[l]}</span><span className={`${styles.ring} ${l === locale ? styles.ringOn : ""}`} aria-hidden="true" />
            </Link>
          ))}
        </nav>
        <div className={styles.actions}>
          <Link href={`/${locale}/onboarding/permissions`} className={styles.fullLink}><Button variant="primary" size="lg" fullWidth label={ar ? "متابعة" : "Continue"} /></Link>
        </div>
      </div>
    </AuthLayout>
  );
}
