"use client";

import { Icon } from "@/components-next/ui-generated/src/Icon";
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
          <Icon name="search" size={22} tone="secondary" />
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
