"use client";

import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import { SearchSuggest, useSearchSuggest } from "@/components-next/search/search-suggest";
import styles from "./home.module.css";

/**
 * The Home hero's search field: still a plain GET form to /search (Enter or the button opens the full results, and it
 * works before JavaScript loads), with the instant suggestions of issue 1544 under it while the patient types.
 */
export function HeroSearch({ locale, placeholder, label, button }: { locale: string; placeholder: string; label: string; button: string }) {
  const { state, controller } = useSearchSuggest(locale);
  return (
    <SearchSuggest
      state={state}
      controller={controller}
      allResultsHref={(q) => `/${locale}/search?q=${encodeURIComponent(q)}`}
      renderField={(combobox) => (
        <form className={styles.search} action={`/${locale}/search`} method="get" role="search">
          <FIcon icon="magnifying-glass" tone="ink" chip="none" size={22} />
          <input
            className={styles.searchInput}
            type="search"
            name="q"
            maxLength={100}
            placeholder={placeholder}
            aria-label={label}
            enterKeyHint="search"
            {...combobox}
            onChange={(event) => controller.input(event.target.value)}
          />
          <button type="submit" className={styles.searchBtn}>{button}</button>
        </form>
      )}
    />
  );
}
