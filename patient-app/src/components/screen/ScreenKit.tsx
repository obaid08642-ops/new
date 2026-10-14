import { useApp } from '../../context/AppContext';
import { autoTranslate, translations } from '../../i18n';
import { tokens, type ThemeName, type Tokens } from '../../../../packages/design-tokens/dist/ts/tokens';
import { SHELL_FONT } from '../../../../packages/ui-native/src';
import { withAlpha } from '../../../../packages/ui-native/src/shells/shellTokens';

/**
 * What the Batch 0 list screens (search, notifications) share, so a screen holds no inset maths, no colour and no
 * font size of its own: the active theme and its tokens, the reading direction, a translator for strings that are
 * not Text children, the type scale, and the tablet column.
 */

export const FONT = SHELL_FONT;

/**
 * The column on wide screens (tablet, 768 and up): centred and at most 440 wide, like the sign-in screens and
 * the desktop layout. Phones (430 and under) are narrower than the cap, so nothing changes there.
 */
export const COLUMN = { width: '100%', maxWidth: 440, alignSelf: 'center' } as const;

/** The number locale of each app language (Arabic keeps Latin digits, as the rest of the app does). */
const NUMBER_LOCALE: Record<string, string> = { ar: 'ar-SA-u-nu-latn', en: 'en-US', ur: 'ur-PK', hi: 'hi-IN', bn: 'bn-BD', fil: 'fil-PH' };

/** A number in the language's own format (Intl); falls back to English formatting if the runtime lacks the locale. */
export function formatNumber(n: number, lang: string, options?: Intl.NumberFormatOptions): string {
  try {
    return new Intl.NumberFormat(NUMBER_LOCALE[lang] ?? 'en-US', options).format(n);
  } catch {
    return new Intl.NumberFormat('en-US', options).format(n);
  }
}

/** A message of the translation files (patient-app/src/i18n/locales) with its {name} slots filled. A missing key shows the key, never another language. */
export function message(lang: string, key: string, vars?: Record<string, string | number>): string {
  const bucket = (translations as unknown as Record<string, Record<string, string>>)[lang];
  const text = bucket?.[key] ?? key;
  return vars ? text.replace(/\{(\w+)\}/g, (slot, name: string) => (name in vars ? String(vars[name]) : slot)) : text;
}

/** The active theme, its tokens, the reading direction and a translator for strings that are not Text children. */
export function useScreenUi() {
  const { isDark, lang, isRTL } = useApp();
  const theme: ThemeName = isDark ? 'dark' : 'light';
  const t = tokens(theme);
  const tr = (s: string): string => autoTranslate(s, lang);
  /** A message of the translation files by key (the way every new screen gets its text). */
  const k = (key: string, vars?: Record<string, string | number>): string => message(lang, key, vars);
  /** A number or an amount of money in the language's format. */
  const num = (n: number, options?: Intl.NumberFormatOptions): string => formatNumber(n, lang, options);
  const money = (n: number): string => formatNumber(n, lang, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const dir: 'rtl' | 'ltr' = isRTL ? 'rtl' : 'ltr';
  /**
   * Data text (names, notes, anything the server wrote) is aligned to the start of its row by the screen's direction,
   * not by its own script: a Latin drug name in an Arabic row sits at the start like the rest of the column.
   */
  const flow = { writingDirection: dir, textAlign: dir === 'rtl' ? 'right' : 'left' } as const;
  return { theme, t, c: t.color, lang, isRTL, dir, flow, tr, k, num, money };
}

type Scale = keyof Tokens['font']['size'];
type Weight = 'regular' | 'medium' | 'bold';

const FACE: Record<Weight, string> = { regular: FONT.regular, medium: FONT.medium, bold: FONT.bold };

/**
 * One step of the type scale (tokens `font.size`): its size, its line height (a multiplier in the tokens,
 * tuned for Arabic) and the face of its weight, unless the board draws the same size in another weight.
 */
export function step(t: Tokens, scale: Scale, weight?: Weight) {
  const spec = t.font.size[scale];
  const size = parseFloat(spec.size);
  const own: Weight = spec.weight >= 700 ? 'bold' : spec.weight >= 500 ? 'medium' : 'regular';
  return { fontSize: size, lineHeight: Math.round(size * parseFloat(spec.lineHeight)), fontFamily: FACE[weight ?? own] };
}

/** A token colour at an alpha (what CSS color-mix does on the web). */
export const tint = withAlpha;
