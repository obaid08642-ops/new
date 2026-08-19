import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { authCookieNames } from "@/lib/auth/cookies";
import { isLocale } from "@/lib/i18n";

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) redirect("/ar/login");
  const hasAccessToken = Boolean((await cookies()).get(authCookieNames.access)?.value);
  if (!hasAccessToken) redirect(`/${locale}/login`);
  setRequestLocale(locale);
  const t = await getTranslations("Dashboard");
  return <main className="main dashboard"><div className="eyebrow">{t("eyebrow")}</div><h1>{t("title")}</h1><section className="status-card"><p>{t("body")}</p><div className="hero-actions"><Link className="button button-primary" href={`/${locale}/orders`}>{t("orders")}</Link><Link className="button button-secondary" href={`/${locale}/appointments`}>{t("appointments")}</Link><Link className="button button-secondary" href={`/${locale}/diagnostics`}>{t("diagnostics")}</Link><Link className="button button-secondary" href={`/${locale}/medicines`}>{t("medicines")}</Link><Link className="button button-secondary" href={`/${locale}/profile`}>{t("profile")}</Link></div></section></main>;
}
