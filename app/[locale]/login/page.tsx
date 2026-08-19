import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LoginForm } from "@/components/login-form";
import { isLocale } from "@/lib/i18n";
type Props = { params: Promise<{ locale: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> { const { locale } = await params; if (!isLocale(locale)) return {}; const t = await getTranslations({ locale, namespace: "Metadata" }); return { title: t("loginTitle"), robots: { index: false, follow: false } }; }
export default async function LoginPage({ params }: Props) { const { locale } = await params; if (!isLocale(locale)) notFound(); setRequestLocale(locale); const shared = await getTranslations("Shared"); const t = await getTranslations("Login"); return <main className="main auth-wrap"><section className="auth-card"><div className="eyebrow">{shared("privateAccess")}</div><h1>{t("title")}</h1><p>{t("body")}</p><LoginForm locale={locale} /><p className="form-note">{t("sandboxNote")}</p></section></main>; }
