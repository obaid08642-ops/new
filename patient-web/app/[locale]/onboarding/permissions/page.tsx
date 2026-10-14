import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthLayout } from "@/components-next/auth/auth-layout";
import { OnboardingPermissionsClient } from "@/components-next/onboarding-permissions-client";
import { isLocale } from "@/lib/i18n";
import styles from "@/components-next/auth/auth.module.css";

type Props = { params: Promise<{ locale: string }> };

/** Location and notification consent, then welcome (parity with app onboarding/permissions). */
export default async function OnboardingPermissionsPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Onboarding" });
  return (
    <AuthLayout locale={locale} backHref={`/${locale}/onboarding/language`}>
      <div className={styles.heading}>
        <h1 className={styles.title}>{t("permissionsTitle")}</h1>
        <p className={styles.subtitle}>{t("permissionsBody")}</p>
      </div>
      <OnboardingPermissionsClient locale={locale} />
    </AuthLayout>
  );
}
