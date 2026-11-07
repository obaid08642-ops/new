"use client";

import { useId, useRef, useState, type ComponentType } from "react";
import { Icon } from "@/components-next/ui-generated/src/Icon";
import suggest from "@/components-next/search/search-suggest.module.css";
import styles from "./home.module.css";

type Props = { locale: string; placeholder: string; label: string; button: string };
type LiveProps = Props & { defaultValue?: string; focusOnMount?: boolean };

/**
 * The Home hero's search field: a plain GET form to /search (Enter or the button opens the full results, and it works
 * before JavaScript loads). The instant suggestions of issue 1544 are not in the first load: the first time the field is
 * focused they load and take its place (same markup and wrapper, same text, caret kept), so a visitor who never searches
 * never downloads them.
 */
export function HeroSearch(props: Props) {
  const { locale, placeholder, label, button } = props;
  const [Live, setLive] = useState<ComponentType<LiveProps> | null>(null);
  const [value, setValue] = useState("");
  const loading = useRef(false);
  const listId = `${useId()}-suggestions`;
  if (Live) return <Live {...props} defaultValue={value} focusOnMount />;
  const load = () => {
    if (loading.current) return;
    loading.current = true;
    void import("./hero-search-live").then((m) => setLive(() => m.HeroSearchLive));
  };
  return (
    <div className={suggest.wrap}>
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
          autoComplete="off"
          role="combobox"
          aria-expanded={false}
          aria-controls={listId}
          aria-autocomplete="list"
          onFocus={load}
          onChange={(event) => setValue(event.target.value)}
        />
        <button type="submit" className={styles.searchBtn}>{button}</button>
      </form>
      {/* the collapsed suggestion list the combobox points to (empty until the live field replaces this one) */}
      <ul id={listId} role="listbox" aria-label={label} hidden />
    </div>
  );
}
