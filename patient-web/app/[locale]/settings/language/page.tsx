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

  // Static i18n — no backend binding, no mock
  return (
    <main className={`main ${styles.page}`}>
      <Link
        href={`/${locale}/settings`}
        style={{ color: "#1E332E", fontWeight: 760, textDecoration: "none", overflowWrap: "anywhere" } as any}
      >
        {ar ? "الإعدادات" : "Settings"}
      </Link>

      <section className={styles.hero}>
        <p className={styles.eyebrow}>
          <Languages size={15} aria-hidden="true" />
          {ar ? "اللغة" : "Language"}
        </p>
        <h1
          style={
            {
              overflowWrap: "anywhere",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            } as any
          }
        >
          {ar ? "لغة التطبيق" : "App language"}
        </h1>
        <p style={{ overflowWrap: "anywhere" } as any}>
          {ar ? "اختر لغتك المفضلة — تُحفظ على هذا الجهاز." : "Choose your preferred language — saved on this device."}
        </p>
        <span
          className={styles.icon}
          style={{ backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" } as any}
          aria-hidden="true"
        >
          <Languages size={22} color="#1E332E" />
        </span>
      </section>

      <section className={styles.card}>
        <span className={styles.icon} aria-hidden="true">
          <Languages size={20} />
        </span>
        <div style={{ minInlineSize: 0, display: "grid", gap: 8 }}>
          <h2
            style={
              {
                margin: 0,
                overflowWrap: "anywhere",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              } as any
            }
          >
            {ar ? "اختر اللغة" : "Choose language"}
          </h2>
          <p style={{ margin: 0, overflowWrap: "anywhere" } as any}>
            {ar ? "يتم تطبيق اللغة فوراً على هذا الجهاز." : "Language applies instantly on this device."}
          </p>
          <div style={{ marginTop: 8 }}>
            <LocaleSelector current={locale} label={ar ? "اللغة" : "Language"} />
          </div>
        </div>
      </section>

      <p className={styles.boundary} style={{ overflowWrap: "anywhere" } as any}>
        {ar ? "تُحفظ اللغة محلياً فقط ولا تتم مشاركتها مع الخادم." : "Language is stored locally only and is not sent to the server."}
      </p>
    </main>
  );
}
