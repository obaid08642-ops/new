"use client";

import "./globals.css";
import { SITE_LOCALES, type SiteLocale } from "@/lib/i18n/device-locale";
import { getGlobalErrorCopy } from "@/lib/i18n/global-error";

/**
 * 15.5: the root layout itself failed, so no provider or layout is left to draw with. The copy is read from the message
 * files for the language in the address (or Arabic), and the page is a plain card in the site's own styles, so a failure
 * above the locale layout never shows Next's bare default page. "Try again" re-renders the app; the home link is a full
 * navigation, which also clears the failed tree.
 */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const first = typeof window === "undefined" ? undefined : window.location.pathname.split("/")[1];
  const locale: SiteLocale = (SITE_LOCALES as readonly string[]).includes(first ?? "") ? (first as SiteLocale) : "ar";
  const copy = getGlobalErrorCopy(locale);
  return (
    <html lang={locale} dir={copy.dir}>
      <body>
        <main className="main auth-wrap">
          <section className="auth-card" role="alert">
            <h1>{copy.title}</h1>
            <p>{copy.body}</p>
            <button type="button" className="button button-primary" onClick={reset}>{copy.retry}</button>
            <p><a href={`/${locale}`}>{copy.returnHome}</a></p>
          </section>
        </main>
      </body>
    </html>
  );
}
