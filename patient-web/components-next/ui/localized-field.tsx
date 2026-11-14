import { createElement, type ElementType, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { resolveLocalizedField, resolveLocalizedList, fieldMark, type FieldMark, type FieldLocale, type LocalizedListResult, type PerLocaleText } from "@/lib/i18n/localized-field";
import styles from "./localized-field.module.css";

/**
 * A catalogue field that is never hidden for lacking the page language (rules in lib/i18n/localized-field.ts). Works in server
 * and client components. The text carries its own lang/dir when they differ from the page's; a fallback adds a small muted
 * one-line note under it (`note={false}` where a note cannot fit).
 */

/** The small muted note under a fallback text (the only part that reads messages, so a text in the page language needs no provider). */
function FallbackNote({ from }: { from: "ar" | "en" }) {
  const t = useTranslations("Shared");
  return <small className={styles.note} data-testid="language-fallback-note">{t(from === "ar" ? "availableInArabicOnly" : "availableInEnglishOnly")}</small>;
}

/** A resolved text drawn with its mark (for rows built on the server and drawn in a client component). */
export function FieldText({ text, mark, as = "span" as ElementType, className, note = true, children }: {
  text: string;
  mark?: FieldMark;
  as?: ElementType;
  className?: string;
  note?: boolean;
  /** Render the text through a wrapper (e.g. a list of lines); gets the resolved text. */
  children?: (text: string) => ReactNode;
}) {
  if (!text) return null;
  // nothing to add (page-language text, no wrapper asked for): the bare text, so a heading or a card keeps its markup
  if (!mark && !className && as === "span" && !children) return <>{text}</>;
  const body = createElement(as, { className, ...(mark ? { lang: mark.lang, dir: mark.dir } : {}) }, children ? children(text) : text);
  if (!mark?.fallbackFrom || !note) return body;
  return (
    <>
      {body}
      <FallbackNote from={mark.fallbackFrom} />
    </>
  );
}

export function LocalizedField({ locale, ar, en, perLocale, ...rest }: {
  locale: string;
  ar?: string | null;
  en?: string | null;
  perLocale?: PerLocaleText;
  as?: ElementType;
  className?: string;
  note?: boolean;
  children?: (text: string) => ReactNode;
}) {
  const field = resolveLocalizedField({ locale, ar, en, perLocale });
  return <FieldText text={field.text} mark={fieldMark(field, locale)} {...rest} />;
}

/** A list field (preparation, ingredients) shown whole in one language, with the same mark and note as a text. Pass `field` (already resolved) or the columns. */
export function LocalizedList({ locale, ar, en, perLocale, field, className, children }: {
  locale: string;
  ar?: readonly string[] | null;
  en?: readonly string[] | null;
  perLocale?: Partial<Record<FieldLocale | "tl", readonly string[] | null | undefined>>;
  field?: LocalizedListResult;
  className?: string;
  children: (items: string[]) => ReactNode;
}) {
  const list = field ?? resolveLocalizedList({ locale, ar, en, perLocale });
  if (list.items.length === 0) return null;
  const mark = fieldMark({ ...list, text: list.items[0] }, locale);
  return <FieldText text={list.items[0]} mark={mark} as="div" className={className}>{() => children(list.items)}</FieldText>;
}
