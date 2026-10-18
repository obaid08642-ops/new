"use client";

import { Fragment, useEffect, useId, useRef, useState, type FocusEvent, type KeyboardEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  INITIAL_SUGGEST_STATE, SuggestController, highlightParts,
  type SuggestState, type SuggestType, type Suggestion, type TextRange,
} from "@/lib/search/suggest";
import styles from "./search-suggest.module.css";

/** The props the search field's <input> takes to be the combobox of the dropdown (ARIA 1.2 combobox pattern). */
export interface SuggestFieldProps {
  role: "combobox";
  "aria-expanded": boolean;
  "aria-controls": string;
  "aria-autocomplete": "list";
  "aria-activedescendant": string | undefined;
  autoComplete: "off";
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onFocus: () => void;
}

/** One controller per field: the dropdown's state follows the controller's rules (lib/search/suggest.ts). */
export function useSearchSuggest(locale: string) {
  const [state, setState] = useState<SuggestState>(INITIAL_SUGGEST_STATE);
  const ref = useRef<SuggestController | null>(null);
  if (!ref.current) {
    // The browser never keeps an answer (no-store): turning the suggestions kill switch off must apply on the next letter.
    // The edge still caches the shared answer (the route forwards the API's public s-maxage) and is purged on every change.
    ref.current = new SuggestController({ locale, fetcher: (url, init) => fetch(url, { ...init, cache: "no-store" }), onChange: setState });
  }
  const controller = ref.current;
  useEffect(() => () => controller.dispose(), [controller]);
  return { state, controller };
}

/** The matched part of the name (the server's ranges) in a <mark>: text nodes only, nothing from the server is drawn as HTML. */
export function SuggestName({ name, highlights }: { name: string; highlights: readonly TextRange[] }) {
  return <>{highlightParts(name, highlights).map((part, i) => (part.match ? <mark key={i} className={styles.mark}>{part.text}</mark> : <Fragment key={i}>{part.text}</Fragment>))}</>;
}

type KindKey = "kindMedicine" | "kindDoctor" | "kindSpecialty" | "kindLab" | "kindLabPackage" | "kindRadiology" | "kindNursing" | "kindArticle";
const KIND: Record<SuggestType, KindKey> = {
  medicine: "kindMedicine", doctor: "kindDoctor", specialty: "kindSpecialty", lab_test: "kindLab", // i18n-ok: Search message keys
  lab_package: "kindLabPackage", radiology: "kindRadiology", nursing: "kindNursing", article: "kindArticle", // i18n-ok: Search message keys
};

export interface SearchSuggestProps {
  state: SuggestState;
  controller: SuggestController;
  /** Draws the field; spread the given props on its <input>. */
  renderField: (props: SuggestFieldProps) => ReactNode;
  /** The full results page for the typed text (shown under the suggestions); none on the results page itself. */
  allResultsHref?: (query: string) => string;
}

/**
 * Issue 1544: the dropdown of instant suggestions under a search field. ArrowDown/ArrowUp move through the options,
 * Enter opens the highlighted one (with none highlighted, the field's own submit goes ahead), Esc closes. When the
 * "search suggestions" kill switch is off (the controller's status "off"), nothing is drawn and the field is a plain
 * search field.
 */
export function SearchSuggest({ state, controller, renderField, allResultsHref }: SearchSuggestProps) {
  const t = useTranslations("SearchSuggest");
  const kinds = useTranslations("Search");
  const router = useRouter();
  const base = useId();
  const listId = `${base}-list`;
  const optionId = (i: number) => `${base}-opt-${i}`;
  const off = state.status === "off";
  const open = !off && state.open;
  const active = open && state.active >= 0 ? state.active : -1;

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;
    const result = controller.key(event.key);
    if (result.kind === "none") return;
    event.preventDefault();
    if (result.kind === "open") router.push(result.href);
  };
  const onBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) controller.close();
  };

  const field = renderField({
    role: "combobox",
    "aria-expanded": open,
    "aria-controls": listId,
    "aria-autocomplete": "list",
    "aria-activedescendant": active >= 0 ? optionId(active) : undefined,
    autoComplete: "off",
    onKeyDown,
    onFocus: () => controller.reopen(),
  });

  let body: ReactNode = null;
  if (open && state.status === "loading") body = <p className={styles.state}>{t("loading")}</p>;
  else if (open && state.status === "error") {
    body = <div role="alert" className={styles.state}>
      <span>{t("error")}</span>
      <button type="button" className={styles.action} onClick={() => controller.retry()}>{t("retry")}</button>
    </div>;
  } else if (open && state.status === "ready" && state.items.length === 0) body = <p className={styles.state}>{t("empty", { query: state.query })}</p>;
  const items: Suggestion[] = open && state.status === "ready" ? state.items : [];

  return (
    <div className={styles.wrap} onBlur={onBlur}>
      {field}
      <div className={styles.popup} hidden={!open}>
        <ul id={listId} role="listbox" aria-label={t("listLabel")} className={styles.list}>
          {items.map((item, i) => (
            <li key={`${item.type}-${item.id}`} role="presentation">
              <Link
                id={optionId(i)}
                role="option"
                aria-selected={i === active}
                tabIndex={-1}
                href={item.href}
                className={styles.option}
                onMouseMove={() => controller.hover(i)}
                onClick={() => controller.close()}
              >
                <span className={styles.name}><SuggestName name={item.name} highlights={item.highlights} /></span>
                <span className={styles.kind}>{kinds(KIND[item.type])}</span>
              </Link>
            </li>
          ))}
        </ul>
        {body}
        {open && allResultsHref && (state.status === "ready" || state.status === "error") ? (
          <Link href={allResultsHref(state.query)} className={styles.all} tabIndex={-1} onClick={() => controller.close()}>{t("seeAll", { query: state.query })}</Link>
        ) : null}
      </div>
      {/* how many suggestions there are, for a screen reader (the list itself is not read until the arrows move) */}
      <span role="status" className="sr-only">{open && state.status === "ready" ? t("count", { count: state.items.length }) : ""}</span>
    </div>
  );
}
