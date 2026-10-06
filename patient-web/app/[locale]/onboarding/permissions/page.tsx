import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
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
  const ar = locale === "ar";
  return (
    <AuthLayout locale={locale} backHref={`/${locale}/onboarding/language`}>
      <div className={styles.heading}>
        <h1 className={styles.title}>{ar ? "الأذونات" : "Permissions"}</h1>
        <p className={styles.subtitle}>{ar ? "نطلب القدر اللازم فقط، ويمكنك التخطي دائمًا." : "We ask only for what is needed, and you can always skip."}</p>
      </div>
      <OnboardingPermissionsClient locale={locale} />
    </AuthLayout>
  );
}
