import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isLocale } from "@/lib/i18n";
type Props = { params: Promise<{ locale: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> { const { locale } = await params; if (!isLocale(locale)) return {}; const t = await getTranslations({ locale, namespace: "Metadata" }); return { title: t("portalTitle"), robots: { index: false, follow: false } }; }
export default async function LandingPage({ params }: Props) { const { locale } = await params; if (!isLocale(locale)) return null; setRequestLocale(locale); const t = await getTranslations("Home"); return <main className="main"><section className="hero"><div><div className="eyebrow">{t("eyebrow")}</div><h1>{t("title")}</h1><p>{t("body")}</p><div className="hero-actions"><Link className="button button-primary" href={`/${locale}/login`}>{t("signIn")}</Link><Link className="button button-secondary" href={`/${locale}/dashboard`}>{t("openPortal")}</Link></div></div><aside className="trust-card"><h2>{t("safeguards")}</h2><p>{t("safeBody")}</p><ul className="trust-list"><li><span>01</span>{t("safetyOne")}</li><li><span>02</span>{t("safetyTwo")}</li><li><span>03</span>{t("safetyThree")}</li></ul></aside></section></main>; }
