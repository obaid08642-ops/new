import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { cookies } from "next/headers";
import { LocaleSelector } from "@/components-next/locale-selector";
import { SessionActions } from "@/components-next/session-actions";
import { PulseShieldMark } from "@/components-next/pulse-shield-mark";
import { ShieldCheck } from "lucide-react";
import { authCookieNames } from "@/lib/auth/cookies";
import { getDirection, isLocale, locales, type Locale } from "@/lib/i18n";
type Props = Readonly<{ children: React.ReactNode; params: Promise<{ locale: string }> }>;
export async function generateMetadata({ params }: Omit<Props, "children">): Promise<Metadata> { const { locale } = await params; if (!isLocale(locale)) return {}; const t = await getTranslations({ locale, namespace: "Metadata" }); return { metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_ORIGIN || "https://nabd.plus"), title: { default: t("siteTitle"), template: `%s | ${t("siteTitle")}` }, description: t("siteDescription"), alternates: { languages: { ...Object.fromEntries(locales.map((supportedLocale) => [supportedLocale, `/${supportedLocale}`])), "x-default": "/ar" } }, robots: { index: false, follow: false } }; }
export default async function LocaleLayout({ children, params }: Props) { const { locale } = await params; if (!isLocale(locale)) notFound(); const typedLocale = locale as Locale; setRequestLocale(typedLocale); const messages = await getMessages(); const t = await getTranslations("Shared"); const hasAccessToken = Boolean((await cookies()).get(authCookieNames.access)?.value); return <NextIntlClientProvider messages={messages}><div className="shell" lang={typedLocale} dir={getDirection(typedLocale)}><div className="dev-notice" role="alert"><span className="dev-notice-badge">BETA</span><span>{t("devNotice")}</span></div><header className="topbar"><Link className="brand" href={`/${typedLocale}`}><span className="brand-mark"><PulseShieldMark decorative /></span><span className="brand-wordmark">{t("brand")}</span></Link><div className="nav-actions"><LocaleSelector current={typedLocale} label={t("language")} />{hasAccessToken ? <SessionActions locale={typedLocale} accountLabel={t("account")} signOutLabel={t("signOut")} /> : <Link className="button button-primary header-login" href={`/${typedLocale}/login`}><ShieldCheck size={16} aria-hidden="true" /><span>{t("patientSignIn")}</span></Link>}</div></header>{children}</div></NextIntlClientProvider>; }
