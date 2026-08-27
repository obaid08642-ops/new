import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isLocale } from "@/lib/i18n";

type Props = Readonly<{ params: Promise<{ locale: string }> }>;

export default async function LocaleNotFound({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "NotFound" });

  return <main className="main auth-wrap"><section className="auth-card" role="status"><div className="eyebrow">404</div><h1>{t("title")}</h1><p>{t("body")}</p><Link className="button button-primary" href={`/${locale}`}>{t("returnHome")}</Link></section></main>;
}
