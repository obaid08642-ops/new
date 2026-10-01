/**
 * Provider App theme.
 *
 * The VALUES are generated — see tokens.generated.ts, written from
 * packages/design-tokens/tokens.json. This file only adds the two things a
 * flat palette cannot carry on its own: a dark variant and an alpha helper.
 *
 * WHY THIS USED TO BE WRITTEN BY HAND
 *
 * It claimed in its own header to be a "MIRROR of packages/design-tokens" and it
 * was not: it held `primary: '#B8E030'`, `mint: '#5FD9B3'`, `navy: '#1E332E'` —
 * the pre-12.A2 palette — while the owner approved coral. Ten screens imported
 * it, so the provider app wore a brand the product had already replaced.
 *
 * Nothing reported it, and the reason is the point: the token contrast check
 * reads tokens.json, and the runtime contrast check renders patient-web. This
 * file was checked by neither. It is generated now, and
 * tools/design/client-token-sync.mjs fails if a client carries a colour the
 * token file does not declare.
 */

import { dark, light } from './tokens.generated';

export const tokens = light;
export type Tokens = typeof tokens;
export const darkTokens = dark;
export type DarkTokens = typeof dark;

/** The owner palette for both themes, for code that has to switch at runtime. */
export function palette(theme: 'light' | 'dark') {
  return theme === 'dark' ? dark : light;
}

export function withAlpha(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
