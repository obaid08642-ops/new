"use client";

import type { ReactNode } from "react";
import { SearchSuggest, useSearchSuggest } from "@/components-next/search/search-suggest";
import { SUGGEST_SCOPES, type SuggestScope } from "@/lib/search/suggest";

/**
 * A plain GET-form search input (server-rendered page) with the live suggestions of one service under it.
 * The page passes the icon as children and its own class names; Enter still submits the form.
 */
export function SuggestInput({
  locale, scope = SUGGEST_SCOPES.consultations, id, name, defaultValue, placeholder, label, fieldClassName, inputClassName, wrapClassName, children,
}: {
  locale: string;
  scope?: SuggestScope;
  id: string;
  name: string;
  defaultValue?: string;
  placeholder: string;
  label: string;
  fieldClassName: string;
  inputClassName: string;
  wrapClassName?: string;
  children?: ReactNode;
}) {
  const { state, controller } = useSearchSuggest(locale, scope);
  return (
    <SearchSuggest
      state={state}
      controller={controller}
      className={wrapClassName}
      renderField={(combobox) => (
        <label className={fieldClassName}>
          {children}
          <span className="sr-only">{label}</span>
          <input
            id={id}
            name={name}
            type="search"
            defaultValue={defaultValue}
            placeholder={placeholder}
            className={inputClassName}
            onChange={(event) => controller.input(event.target.value)}
            {...combobox}
          />
        </label>
      )}
    />
  );
}
