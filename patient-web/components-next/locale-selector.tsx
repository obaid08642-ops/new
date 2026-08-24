import Link from "next/link";
import { localeLabels, locales, type Locale } from "@/lib/i18n";

export function LocaleSelector({ current, label }: { current: Locale; label: string }) {
  return <nav className="locale-selector" aria-label={label}>{locales.map((locale) => <Link key={locale} className={`locale-option${locale === current ? " locale-option-active" : ""}`} href={`/${locale}`} hrefLang={locale} lang={locale} aria-current={locale === current ? "page" : undefined}>{localeLabels[locale]}</Link>)}</nav>;
}
