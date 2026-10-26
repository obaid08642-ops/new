"use client";

import type { ReactNode } from "react";
import { Button } from "@/components-next/ui-generated/components/Button";
import { Icon } from "@/components-next/ui-generated/src/Icon";
import { SearchSuggest, useSearchSuggest } from "@/components-next/search/search-suggest";
import type { SuggestScope } from "@/lib/search/suggest";
import consult from "@/components-next/consult/consult.module.css";
import styles from "./diag.module.css";

/**
 * The search pill of a service screen (the same markup as SearchForm in diag-parts.tsx, still a GET form that works before the page is
 * interactive) with the live suggestions of this service under it: 2-3 letters, only this service's items (the scope), a pick opens the
 * item, Enter and the button still run the screen's own search.
 */
export function SuggestSearchForm({ action, name = "q", defaultValue, placeholder, label, submitLabel, below, sticky = false, locale, scope }: {
  action?: string;
  name?: string;
  defaultValue?: string;
  placeholder: string;
  label: string;
  submitLabel: string;
  below?: ReactNode;
  /** The search stays under the header while a long list scrolls. */
  sticky?: boolean;
  locale: string;
  scope: SuggestScope;
}) {
  const { state, controller } = useSearchSuggest(locale, scope);
  return (
    <SearchSuggest
      state={state}
      controller={controller}
      allResultsHref={action ? (q) => `${action}?${name}=${encodeURIComponent(q)}` : undefined}
      renderField={(combobox) => (
        <form method="get" action={action} role="search" className={sticky ? `${styles.searchForm} ${styles.searchSticky}` : styles.searchForm}>
          <div className={consult.search}>
            <label className={consult.searchField}>
              <Icon name="search" size={20} tone="secondary" />
              <span className="sr-only">{label}</span>
              <input name={name} defaultValue={defaultValue} placeholder={placeholder} className={consult.searchInput} {...combobox} onChange={(event) => controller.input(event.target.value)} />
            </label>
            <Button type="submit" label={submitLabel} size="lg" />
          </div>
          {below}
        </form>
      )}
    />
  );
}
