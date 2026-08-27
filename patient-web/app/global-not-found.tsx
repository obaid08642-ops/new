import "./globals.css";
import { headers } from "next/headers";
import { getGlobalNotFoundCopy } from "@/lib/i18n/global-notfound";

export default async function GlobalNotFound() {
  const { locale, copy } = getGlobalNotFoundCopy((await headers()).get("x-next-intl-locale"));
  return <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}><body><main className="main auth-wrap"><section className="auth-card"><div className="eyebrow">404</div><h1>{copy.title}</h1><p>{copy.body}</p><a className="button button-primary" href={`/${locale}`}>{copy.returnHome}</a></section></main></body></html>;
}
