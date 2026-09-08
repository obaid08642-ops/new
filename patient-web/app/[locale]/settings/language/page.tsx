import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Languages } from "lucide-react";
import { isLocale } from "@/lib/i18n";
import { LocaleSelector } from "@/components-next/locale-selector";
import styles from "../settings.module.css";

type Props = { params: Promise<{ locale: string }> };

export default async function SettingsLanguagePage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await getTranslations("Settings");
  const ar = locale === "ar";

  return (
    <main className={`main ${styles.page}`}>
      <Link className={styles.back} href={`/${locale}/settings`}>
        {ar ? "الإعدادات" : "Settings"}
      </Link>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>
          <Languages size={15} aria-hidden="true" />
          {ar ? "اللغة" : "Language"}
        </p>
        <h1>{ar ? "لغة التطبيق" : "App language"}</h1>
        <p>{ar ? "اختر لغتك المفضلة — تُحفظ على هذا الجهاز." : "Choose your preferred language — saved on this device."}</p>
      </section>
      <LocaleSelector current={locale} label={ar ? "اللغة" : "Language"} />
    </main>
  );
}
