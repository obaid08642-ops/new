/**
 * patient-app palette.
 *
 * The VALUES are generated — see colors.generated.ts, written from
 * packages/design-tokens/tokens.json by tools/design/sync-client-tokens.mjs.
 * This file only keeps the historical export names, because several hundred
 * call sites use them and the names are the API.
 *
 * WHY THIS USED TO BE HAND-WRITTEN
 *
 * `theme/colors.ts` and `theme/index.ts` together held 172 colour literals and a
 * primary of lime `#7CB518` / `#B8E030`, from a design system that predates the
 * owner's palette. `theme/brand.ts` still says so in its own comment: "الأساسي:
 * الأخضر الليموني" — the primary is lime green. That comment is now wrong, and
 * it was wrong before this change too.
 *
 * The key names are cryptic (`p`, `pd`, `ts`, `prs`) but they are load-bearing,
 * so they are kept and mapped to tokens BY ROLE: `p` was "the primary action
 * colour", so it is now the owner's coral action pair regardless of its name.
 * `ps` and `pt` were pale/deep lime; they are now pale/deep coral, because a
 * pale lime surface behind coral text is a pairing nobody chose.
 *
 * Both themes come from the token file, so a token change moves both at once —
 * which the hand-written pair could not promise.
 */

import { dark, light } from './colors.generated';

export const lightColors: Colors = light;
export const darkColors: Colors = dark;

export type ColorName = keyof typeof light;
export type Colors = Record<ColorName, string>;

/** The palette for one theme, so callers stop branching on it themselves. */
export function colorsFor(theme: 'light' | 'dark'): Colors {
  return theme === 'dark' ? darkColors : lightColors;
}

/**
 * Resolve a colour reference to a value.
 *
 * Kept because ThemeEngine imports it and because the indirection is real: a
 * screen may be handed a token NAME (`p`, `cr`) or a `var(--x)` string, and both
 * have to land on a value. The `#000` fallbacks are unchanged.
 */
export function resolveColor(c: string | undefined | null, colors?: Record<string, string>) {
  if (!c) return '#000';
  if (typeof c !== 'string') return '#000';
  if (c.startsWith('var(')) {
    const v = c.replace('var(--', '').replace(')', '');
    if (colors && colors[v]) return colors[v];
    return (lightColors as Record<string, string>)[v] || c;
  }
  if (colors && colors[c]) return colors[c];
  return c;
}
