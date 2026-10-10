// Urdu-only typography (issue #394, owner decision 2026-10-10): Noto Nastaliq Urdu replaces the app
// families for `ur` ONLY. Every function here returns its input unchanged for any other language, or
// before the font has loaded, so ar/en/hi/bn/tl render exactly as before.

export const URDU_FAMILY = {
  400: 'NotoNastaliqUrdu_400Regular',
  500: 'NotoNastaliqUrdu_500Medium',
  700: 'NotoNastaliqUrdu_700Bold',
} as const;

/** Nastaliq stacks its marks high and low; it needs roughly 1.7x the font size per line. */
export const URDU_LINE_HEIGHT_RATIO = 1.7;

const APP_FAMILY = /^(?:ReadexPro|NotoSansArabic)-(\d{3})$/;

export function isUrduActive(lang: string | undefined | null, ready: boolean): boolean {
  return lang === 'ur' && ready;
}

/** The Nastaliq family of the same weight when lang is `ur` and the font is ready, else `family` itself. */
export function fontFamilyFor<T extends string | undefined>(family: T, lang: string | undefined | null, ready: boolean): T | string {
  if (!family || !isUrduActive(lang, ready)) return family;
  const m = APP_FAMILY.exec(family);
  if (!m) return family;
  const weight = Number(m[1]);
  return weight >= 700 ? URDU_FAMILY[700] : weight >= 500 ? URDU_FAMILY[500] : URDU_FAMILY[400];
}

/** Line height for ur: never below 1.7x the font size. Unchanged for other languages or when not ready. */
export function lineHeightFor(lineHeight: number | undefined, fontSize: number | undefined, lang: string | undefined | null, ready: boolean) {
  if (!isUrduActive(lang, ready) || !fontSize) return lineHeight;
  return Math.max(lineHeight ?? 0, Math.round(fontSize * URDU_LINE_HEIGHT_RATIO));
}

type FlatStyle = { fontFamily?: string; fontSize?: number; lineHeight?: number; [k: string]: unknown };

/** Returns the style untouched (same reference) unless it asks for an app family and ur is active. */
export function urduStyle<S>(style: S, flatten: (s: S) => FlatStyle | undefined, lang: string | undefined | null, ready: boolean): S | FlatStyle {
  if (!isUrduActive(lang, ready)) return style;
  const flat = flatten(style);
  if (!flat || !flat.fontFamily) return style;
  const family = fontFamilyFor(flat.fontFamily, lang, ready);
  if (family === flat.fontFamily) return style;
  const out: FlatStyle = { ...flat, fontFamily: family };
  const lh = lineHeightFor(flat.lineHeight, flat.fontSize, lang, ready);
  if (lh !== undefined) out.lineHeight = lh;
  return out;
}
