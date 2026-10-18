"use client";

import { useId } from "react";
import { Icon } from "@/components-next/ui-generated/src/Icon";
import type { SuggestFieldProps } from "./search-suggest";

/**
 * The search page's field (the shared Search component's `page` variant: the same classes, so the same board) as the
 * combobox of the suggestions dropdown (issue 1544). The shared Search component's contract has no ARIA combobox props
 * (it is shared with the native renderer), so the search page draws its field here.
 */
export function SuggestSearchField({ combobox, value, onChange, onClear, placeholder, label, clearLabel }: {
  combobox: SuggestFieldProps;
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  placeholder: string;
  label: string;
  clearLabel: string;
}) {
  const id = useId();
  return (
    <div className="nabd-search">
      <label htmlFor={id} className="nabd-search__field nabd-search__field--page nabd-search__field--active">
        <Icon name="search" size={20} tone="primary" />
        <input
          id={id}
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          aria-label={label}
          enterKeyHint="search"
          className="nabd-search__input nabd-search__input--page"
          {...combobox}
        />
        {value ? (
          <button type="button" onClick={onClear} aria-label={clearLabel} className="nabd-search__inner">
            <span className="nabd-search__clear-disc"><Icon name="close" size={14} tone="secondary" /></span>
          </button>
        ) : null}
      </label>
    </div>
  );
}
