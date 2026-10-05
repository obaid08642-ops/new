"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Globe, ChevronDown, Check } from "lucide-react";
import { localeLabels, locales, type Locale } from "@/lib/i18n";
import { pathInLocale } from "@/lib/locale-path";
import styles from "./locale-selector.module.css";

export function LocaleSelector({ current, label }: { current: Locale; label: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname() || `/${current}`;
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={styles.wrapper} ref={containerRef}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={label}
      >
        <Globe size={15} aria-hidden="true" className={styles.globeIcon} />
        <span>{localeLabels[current]}</span>
        <ChevronDown size={14} aria-hidden="true" className={`${styles.chevronIcon} ${isOpen ? styles.chevronOpen : ""}`} />
      </button>

      <nav
        className={`${styles.menu} ${!isOpen ? styles.hidden : ""}`}
        aria-label={label}
        role="menu"
      >
        {locales.map((locale) => {
          const isActive = locale === current;
          return (
            <Link
              key={locale}
              href={pathInLocale(pathname, locale)}
              hrefLang={locale}
              lang={locale}
              className={`${styles.option} ${isActive ? styles.activeOption : ""}`}
              aria-current={isActive ? "page" : undefined}
              role="menuitem"
              onClick={(event) => {
                setIsOpen(false);
                // The query string and hash only exist in the browser: keep them (?q= on /search) by navigating
                // there ourselves; without them the plain link is enough.
                const suffix = `${window.location.search}${window.location.hash}`;
                if (suffix && !event.metaKey && !event.ctrlKey && !event.shiftKey && event.button === 0) {
                  event.preventDefault();
                  router.push(`${pathInLocale(pathname, locale)}${suffix}`);
                }
              }}
            >
              <span>{localeLabels[locale]}</span>
              {isActive && <span className={styles.checkIcon} aria-hidden="true"><Check size={14} /></span>}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
