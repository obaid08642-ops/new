"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { SearchSuggest, useSearchSuggest } from "@/components-next/search/search-suggest";
import { SUGGEST_SCOPES, type SuggestScope } from "@/lib/search/suggest";

/**
 * A plain GET-form search input (server-rendered page) with the live suggestions of one service under it.
 * The page passes the icon as children and its own class names; Enter still submits the form.
 */
export function SuggestInputLive({
  locale, scope = SUGGEST_SCOPES.consultations, id, name, defaultValue, placeholder, label, fieldClassName, inputClassName, wrapClassName, children, focusOnMount,
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
  /** The plain field was focused before this code loaded: put the caret back in the same place. */
  focusOnMount?: boolean;
}) {
  const { state, controller } = useSearchSuggest(locale, scope);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (focusOnMount && input.current) { input.current.focus(); const n = input.current.value.length; input.current.setSelectionRange(n, n); if (n) controller.input(input.current.value); }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on mount
  }, []);
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
            ref={input}
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
