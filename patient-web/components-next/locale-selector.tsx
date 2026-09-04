"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Globe, ChevronDown } from "lucide-react";
import { localeLabels, locales, type Locale } from "@/lib/i18n";
import styles from "./locale-selector.module.css";

export function LocaleSelector({ current, label }: { current: Locale; label: string }) {
  const [isOpen, setIsOpen] = useState(false);
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
              href={`/${locale}`}
              hrefLang={locale}
              lang={locale}
              className={`${styles.option} ${isActive ? styles.activeOption : ""}`}
              aria-current={isActive ? "page" : undefined}
              role="menuitem"
              onClick={() => setIsOpen(false)}
            >
              <span>{localeLabels[locale]}</span>
              {isActive && <span className={styles.checkIcon} aria-hidden="true">✓</span>}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
