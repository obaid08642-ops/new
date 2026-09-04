import Link from "next/link";
import { Globe } from "lucide-react";
import { localeLabels, locales, type Locale } from "@/lib/i18n";

export function LocaleSelector({ current, label }: { current: Locale; label: string }) {
  return (
    <div className="locale-switcher">
      <details className="locale-dropdown">
        <summary className="locale-trigger" aria-label={label}>
          <Globe size={15} aria-hidden="true" />
          <span className="locale-current-name">{localeLabels[current]}</span>
        </summary>
        <div className="locale-menu" role="menu">
          {locales.map((locale) => (
            <Link
              key={`m-${locale}`}
              className={`locale-menu-item${locale === current ? " active" : ""}`}
              href={`/${locale}`}
              hrefLang={locale}
              lang={locale}
              role="menuitem"
              aria-current={locale === current ? "page" : undefined}
            >
              <span>{localeLabels[locale]}</span>
              {locale === current ? <span className="locale-check" aria-hidden="true">✓</span> : null}
            </Link>
          ))}
        </div>
      </details>

      <nav className="locale-selector" aria-label={label}>
        {locales.map((locale) => (
          <Link
            key={locale}
            className={`locale-option${locale === current ? " locale-option-active" : ""}`}
            href={`/${locale}`}
            hrefLang={locale}
            lang={locale}
            aria-current={locale === current ? "page" : undefined}
          >
            {localeLabels[locale]}
          </Link>
        ))}
      </nav>
    </div>
  );
}
