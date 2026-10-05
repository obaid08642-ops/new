import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthLayout } from "@/components-next/auth/auth-layout";
import { LinkButton } from "@/components-next/link-button";
import { isLocale, localeLabels, locales } from "@/lib/i18n";
import styles from "@/components-next/auth/auth.module.css";

type Props = { params: Promise<{ locale: string }> };

/** Choose the language, then the permissions step (parity with app onboarding/language). */
export default async function OnboardingLanguagePage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Onboarding" });
  return (
    <AuthLayout locale={locale} backHref={`/${locale}/onboarding`}>
      <div className={styles.heading}>
        <h1 className={styles.title}>{t("languageTitle")}</h1>
        <p className={styles.subtitle}>{t("languageBody")}</p>
      </div>
      <div className={styles.form}>
        <nav className={styles.rows} aria-label={t("languageLabel")}>
          {locales.map((l) => (
            <Link key={l} href={`/${l}/onboarding/language`} hrefLang={l} lang={l} className={`${styles.row} ${l === locale ? styles.rowOn : ""}`} aria-current={l === locale ? "true" : undefined}>
              <span>{localeLabels[l]}</span><span className={`${styles.ring} ${l === locale ? styles.ringOn : ""}`} aria-hidden="true" />
            </Link>
          ))}
        </nav>
        <div className={styles.actions}>
          <LinkButton href={`/${locale}/onboarding/permissions`} label={t("continue")} />
        </div>
      </div>
    </AuthLayout>
  );
}
