"use client";

import { useLayoutEffect, useRef } from "react";
import { Icon } from "@/components-next/ui-generated/src/Icon";
import { SearchSuggest, useSearchSuggest } from "@/components-next/search/search-suggest";
import styles from "./home.module.css";

/**
 * The Home hero's search field with the instant suggestions of issue 1544 under it while the patient types. Loaded on the
 * first focus of the plain field (hero-search.tsx), which it replaces with the same markup, text and caret.
 */
export function HeroSearchLive({ locale, placeholder, label, button, defaultValue, focusOnMount }: { locale: string; placeholder: string; label: string; button: string; defaultValue?: string; focusOnMount?: boolean }) {
  const { state, controller } = useSearchSuggest(locale);
  const input = useRef<HTMLInputElement>(null);
  // A layout effect, not a passive one: this field REPLACES a plain one the moment its code arrives. A passive effect runs after the paint, and a key pressed in that gap goes to <body>
  // (the old input is gone, the new one is not focused yet) and is lost: live gate #2480 shard 4, the request was `q=ر` for "بر". A layout effect runs in the same task as the commit.
  useLayoutEffect(() => {
    if (focusOnMount && input.current) { input.current.focus(); const n = input.current.value.length; input.current.setSelectionRange(n, n); if (n) controller.input(input.current.value); }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on mount
  }, []);
  return (
    <SearchSuggest
      state={state}
      controller={controller}
      allResultsHref={(q) => `/${locale}/search?q=${encodeURIComponent(q)}`}
      renderField={(combobox) => (
        <form className={styles.search} action={`/${locale}/search`} method="get" role="search">
          <Icon name="search" size={22} tone="secondary" />
          <input
            ref={input}
            defaultValue={defaultValue}
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
