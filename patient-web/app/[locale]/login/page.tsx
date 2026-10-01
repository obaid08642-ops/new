import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LoginForm } from "@/components/login-form";
import { isLocale } from "@/lib/i18n";
import { Icon } from "@/components-next/ui-generated/src/Icon";
import styles from "./login.module.css";
type Props = { params: Promise<{ locale: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> { const { locale } = await params; if (!isLocale(locale)) return {}; const t = await getTranslations({ locale, namespace: "Metadata" }); return { title: t("loginTitle"), robots: { index: false, follow: false } }; }
export default async function LoginPage({ params }: Props) { const { locale } = await params; if (!isLocale(locale)) notFound(); setRequestLocale(locale); const shared = await getTranslations("Shared"); const t = await getTranslations("Login"); return <main className={`main ${styles.page}`}><section className={styles.card}><div className={styles.icon}><Icon name="lock-keyhole" size={25} /></div><p className={styles.eyebrow}><Icon name="shield-check" size={15} />{shared("privateAccess")}</p><h1>{t("title")}</h1><p className={styles.description}>{t("body")}</p><LoginForm locale={locale} /></section></main>; }
