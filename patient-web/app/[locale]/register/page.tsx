import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Icon } from "@/components-next/ui-generated/src/Icon";
import { RegisterForm } from "@/components-next/register-form";
import { isLocale } from "@/lib/i18n";
import styles from "../login/login.module.css";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return { title: locale === "ar" ? "إنشاء حساب | نبض بلس" : "Create account | Nabd Plus", robots: { index: false, follow: false } };
}

export default async function RegisterPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const shared = await getTranslations("Shared");
  return <main className={`main ${styles.page}`}><section className={styles.card}><div className={styles.icon} style={{inlineSize:'48px',blockSize:'48px'}}><Icon name="user-round-plus" size={48} /></div><p className={styles.eyebrow}><Icon name="lock-keyhole" size={15} />{shared("privateAccess")}</p><h1>{locale === "ar" ? "إنشاء حساب" : locale === "en" ? "Create your account" : "Create account"}</h1><p className={styles.description}>{locale === "ar" ? "انضم إلى نبض بلس وابدأ رحلتك الصحية." : locale === "en" ? "Join Nabd Plus and start your care journey." : "Complete your details to start your care journey."}</p><RegisterForm locale={locale} /></section></main>;
}
