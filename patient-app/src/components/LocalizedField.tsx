import React from 'react';
import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';

import {
  fieldMark,
  resolveLocalizedField,
  resolveLocalizedList,
  type FieldLocale,
  type FieldMark,
  type LocalizedListResult,
  type PerLocaleText,
} from '../utils/localizedField';
import { step as scale, useScreenUi } from './screen/ScreenKit';

/**
 * A catalogue field that is never hidden for lacking the page language (rules: src/utils/localizedField.ts, the same as the web). The
 * text carries its own writing direction and language when they differ from the page's; a fallback adds ONE small muted line under
 * it ("Available in English only" / "Available in Arabic only", keys common.availableIn*Only). `note={false}` where a note cannot fit
 * (the text then still carries its direction).
 */

/** Native text props for a mark: the shown text's own direction, alignment and language (`accessibilityLanguage` on iOS, `lang` on web). */
export function markTextProps(mark?: FieldMark): { style?: TextStyle; accessibilityLanguage?: string; lang?: string } {
  if (!mark) return {};
  return {
    style: { writingDirection: mark.dir, textAlign: mark.dir === 'rtl' ? 'right' : 'left' },
    accessibilityLanguage: mark.lang === 'fil' ? 'fil' : mark.lang,
    lang: mark.lang,
  };
}

/** The small muted one-line note under a fallback text. Never wraps, so it cannot push a price or an action. */
export function FallbackNote({ from, testID, centered = false }: { from: 'ar' | 'en'; testID?: string; centered?: boolean }) {
  const { t, c, k, flow } = useScreenUi();
  return (
    <Text
      numberOfLines={1}
      ellipsizeMode="tail"
      testID={testID ?? 'language-fallback-note'}
      style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow, ...(centered ? { textAlign: 'center' as const } : null) }}
    >
      {k(from === 'ar' ? 'common.availableInArabicOnly' : 'common.availableInEnglishOnly')}
    </Text>
  );
}

/** Just the note for a mark (nothing when the text is in the page language, or the mark is a script tag only). */
export function MarkNote({ mark, centered = false }: { mark?: FieldMark; centered?: boolean }) {
  return mark?.fallbackFrom ? <FallbackNote from={mark.fallbackFrom} centered={centered} /> : null;
}

/** A resolved text drawn with its mark (for rows a mapper already resolved). Returns a fragment: the Text, then the note. */
export function FieldText({ text, mark, style, numberOfLines, note = true, testID, accessibilityRole, children }: {
  text: string;
  mark?: FieldMark;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  note?: boolean;
  testID?: string;
  accessibilityRole?: 'header' | 'text';
  /** Extra Text children after the text (e.g. an inline icon). */
  children?: React.ReactNode;
}) {
  if (!text) return null;
  const own = markTextProps(mark);
  // a centred text (a detail head) keeps its centring; only its writing direction follows the shown text
  const centered = StyleSheet.flatten(style)?.textAlign === 'center';
  if (centered && own.style) delete own.style.textAlign;
  return (
    <>
      <Text testID={testID} accessibilityRole={accessibilityRole} numberOfLines={numberOfLines} style={[style, own.style]} accessibilityLanguage={own.accessibilityLanguage} {...(own.lang ? ({ lang: own.lang } as object) : {})}>
        {children ? [text, children] : text}
      </Text>
      {note ? <MarkNote mark={mark} centered={centered} /> : null}
    </>
  );
}

/** A field from its columns: the Arabic and English text (and the per-language texts of a multilingual one), in the app's language. */
export function LocalizedField({ ar, en, perLocale, ...rest }: {
  ar?: string | null;
  en?: string | null;
  perLocale?: PerLocaleText;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  note?: boolean;
  testID?: string;
  accessibilityRole?: 'header' | 'text';
  children?: React.ReactNode;
}) {
  const { lang } = useScreenUi();
  const field = resolveLocalizedField({ locale: lang, ar, en, perLocale });
  return <FieldText text={field.text} mark={fieldMark(field, lang)} {...rest} />;
}

/** A list field (preparation steps) shown whole in one language, with the same mark and note. Gives each line to `children`. */
export function LocalizedList({ ar, en, perLocale, field, children }: {
  ar?: readonly string[] | null;
  en?: readonly string[] | null;
  perLocale?: Partial<Record<FieldLocale | 'tl', readonly string[] | null | undefined>>;
  field?: LocalizedListResult;
  children: (items: string[], mark?: FieldMark) => React.ReactNode;
}) {
  const { lang } = useScreenUi();
  const list = field ?? resolveLocalizedList({ locale: lang, ar, en, perLocale });
  if (list.items.length === 0) return null;
  const mark = fieldMark({ ...list, text: list.items[0] }, lang);
  return (
    <>
      {children(list.items, mark)}
      <MarkNote mark={mark} />
    </>
  );
}

/** The props a ui-native card takes for a name with a mark: its own language and direction, and the already translated one-line note. */
export function nameProps(mark: FieldMark | undefined, k: (key: string) => string): { nameLang?: string; nameDir?: 'rtl' | 'ltr'; nameNote?: string } {
  if (!mark) return {};
  return {
    nameLang: mark.lang,
    nameDir: mark.dir,
    nameNote: mark.fallbackFrom ? k(mark.fallbackFrom === 'ar' ? 'common.availableInArabicOnly' : 'common.availableInEnglishOnly') : undefined,
  };
}
