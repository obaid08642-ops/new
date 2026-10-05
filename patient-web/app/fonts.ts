import localFont from "next/font/local";

/*
 * Self-hosted web fonts (docs/design/DESIGN_HANDOFF_FINAL.md §1: "Readex Pro in all
 * 6 languages, with Noto fallbacks. Self-host the font so builds do not depend on
 * Google Fonts").
 *
 * The files in ./fonts are the variable fonts from github.com/google/fonts (SIL Open
 * Font License, see the OFL-*.txt next to them), converted to woff2 with the width
 * axes pinned to their defaults (Readex Pro HEXP=0, Noto wdth=100), so one file covers
 * every weight. Readex Pro is further subset (F82-1) to Latin + Arabic, the two scripts it
 * draws (78.6 KB to 51.4 KB; every character in the six message catalogues is still covered).
 * next/font serves them from this origin (the CSP allows only font-src 'self') with a
 * metric-matched fallback, so text does not jump on swap.
 *
 * Only Readex Pro is preloaded: it is the first family on every page. Each Noto face is
 * limited to its own script (unicode-range), so it is downloaded only when a page renders
 * that script, and Latin text on an Urdu/Hindi/Bengali page falls through to Readex Pro.
 * Readex Pro itself has no Urdu-specific letters (ٹ ڈ ڑ ھ ہ ی ے), which is why Urdu
 * leads with Nastaliq rather than mixing faces inside a word.
 *
 * The family order per locale is the one in packages/design-tokens/tokens.json
 * (font.family.locale); app/globals.css applies it, and tests/self-hosted-fonts.test.ts
 * checks that the two agree.
 */

export const readexPro = localFont({
  src: "./fonts/ReadexPro-Variable.woff2",
  weight: "160 700",
  style: "normal",
  display: "swap",
  variable: "--font-readex-pro",
  preload: true,
});

export const notoSansArabic = localFont({
  src: "./fonts/NotoSansArabic-Variable.woff2",
  weight: "100 900",
  style: "normal",
  display: "swap",
  variable: "--font-noto-sans-arabic",
  preload: false,
  declarations: [{ prop: "unicode-range", value: "U+0600-06FF, U+0750-077F, U+0870-08FF, U+FB50-FDFF, U+FE70-FEFF, U+200C-200F, U+25CC" }],
});

export const notoNastaliqUrdu = localFont({
  src: "./fonts/NotoNastaliqUrdu-Variable.woff2",
  weight: "400 700",
  style: "normal",
  display: "swap",
  variable: "--font-noto-nastaliq-urdu",
  preload: false,
  declarations: [{ prop: "unicode-range", value: "U+0600-06FF, U+0750-077F, U+0870-08FF, U+FB50-FDFF, U+FE70-FEFF, U+200C-200F, U+25CC" }],
});

export const notoSansDevanagari = localFont({
  src: "./fonts/NotoSansDevanagari-Variable.woff2",
  weight: "100 900",
  style: "normal",
  display: "swap",
  variable: "--font-noto-sans-devanagari",
  preload: false,
  declarations: [{ prop: "unicode-range", value: "U+0900-097F, U+A8E0-A8FF, U+1CD0-1CFF, U+200C-200D, U+20B9, U+25CC" }],
});

export const notoSansBengali = localFont({
  src: "./fonts/NotoSansBengali-Variable.woff2",
  weight: "100 900",
  style: "normal",
  display: "swap",
  variable: "--font-noto-sans-bengali",
  preload: false,
  declarations: [{ prop: "unicode-range", value: "U+0980-09FF, U+200C-200D, U+20B9, U+25CC" }],
});

/** Every font variable, for the className of the element that sets the page font. */
export const fontVariables = [readexPro, notoSansArabic, notoNastaliqUrdu, notoSansDevanagari, notoSansBengali]
  .map((font) => font.variable)
  .join(" ");
