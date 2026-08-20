import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { LocaleSelector } from "@/components-next/locale-selector";
import { getDirection, isLocale, locales, type Locale } from "@/lib/i18n";
type Props = Readonly<{ children: React.ReactNode; params: Promise<{ locale: string }> }>;
export async function generateMetadata({ params }: Omit<Props, "children">): Promise<Metadata> { const { locale } = await params; if (!isLocale(locale)) return {}; const t = await getTranslations({ locale, namespace: "Metadata" }); return { metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_ORIGIN || "https://nabd.plus"), title: { default: t("siteTitle"), template: `%s | ${t("siteTitle")}` }, description: t("siteDescription"), alternates: { languages: { ...Object.fromEntries(locales.map((supportedLocale) => [supportedLocale, `/${supportedLocale}`])), "x-default": "/ar" } }, robots: { index: false, follow: false } }; }
export default async function LocaleLayout({ children, params }: Props) { const { locale } = await params; if (!isLocale(locale)) notFound(); const typedLocale = locale as Locale; setRequestLocale(typedLocale); const messages = await getMessages(); const t = await getTranslations("Shared"); return <NextIntlClientProvider messages={messages}><div className="shell" lang={typedLocale} dir={getDirection(typedLocale)}><header className="topbar"><Link className="brand" href={`/${typedLocale}`}><span className="brand-mark">ن</span><span>{t("brand")}</span></Link><div className="nav-actions"><LocaleSelector current={typedLocale} label={t("language")} /><Link className="button button-primary" href={`/${typedLocale}/login`}>{t("patientSignIn")}</Link></div></header>{children}</div></NextIntlClientProvider>; }
