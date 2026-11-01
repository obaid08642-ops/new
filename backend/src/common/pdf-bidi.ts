/**
 * Mixed Arabic / Latin / number text for pdfkit.
 *
 * pdfkit lays out one string at a time and, through fontkit, shapes Arabic (joined letter forms) and orders the glyphs of an
 * all-Arabic string right to left. It does not order a line that mixes directions: an Arabic label next to a number or an English
 * name comes out in the wrong order. `bidiRuns` splits a logical line into runs of one script and puts the runs in visual order
 * (left to right on the page); each run is then drawn as written, so fontkit still shapes and orders the Arabic inside it.
 *
 * This is the part of the Unicode bidirectional algorithm a receipt needs: strong Arabic and Latin letters, digits kept together
 * with their separators and signs (115.00, -15, 15%, 2026-11-01), and punctuation and spaces taking the direction of what is
 * around them. It does not do mirrored brackets or embedding controls; labels here use neither.
 */
export type Run = { text: string; rtl: boolean };

const R = /[֐-ࣿיִ-﷿ﹰ-﻿]/;
const L = /[A-Za-zÀ-ɏ]/;
const DIGIT = /[0-9٠-٩۰-۹]/;
const NUMBER_JOINER = /[.,:/٫٬]/; // inside a number: 1,500.00 2026/11/01 12:30
const NUMBER_SIGN = /[+\-%$٪]/; // beside a number: -15 15%

type Kind = 'R' | 'L' | 'N' | 'X'; // Arabic, Latin, number, neutral

function kinds(text: string): Kind[] {
  const chars = [...text];
  const k: Kind[] = chars.map((c) => (R.test(c) && !DIGIT.test(c) ? 'R' : L.test(c) ? 'L' : DIGIT.test(c) ? 'N' : 'X'));
  // a joiner between two digits, and a sign right before or after digits, belong to the number
  for (let i = 0; i < chars.length; i++) {
    if (k[i] !== 'X') continue;
    if (NUMBER_JOINER.test(chars[i]) && k[i - 1] === 'N' && k[i + 1] === 'N') k[i] = 'N';
  }
  for (let i = 0; i < chars.length; i++) {
    if (k[i] !== 'X' || !NUMBER_SIGN.test(chars[i])) continue;
    if (k[i + 1] === 'N' || k[i - 1] === 'N') k[i] = 'N';
  }
  return k;
}

/** Embedding level of every character: 0 left-to-right text, 1 right-to-left text, 2 numbers and Latin inside right-to-left text. */
function levels(text: string, base: 'ltr' | 'rtl'): number[] {
  const k = kinds(text);
  const rtlBase = base === 'rtl';
  const dir = (kind: Kind): 'R' | 'L' | null => (kind === 'R' ? 'R' : kind === 'L' ? 'L' : kind === 'N' ? (rtlBase ? 'R' : 'L') : null);
  const out: number[] = new Array(k.length).fill(rtlBase ? 1 : 0);
  for (let i = 0; i < k.length; i++) {
    if (k[i] === 'R') out[i] = 1;
    else if (k[i] === 'L' || k[i] === 'N') out[i] = rtlBase ? 2 : 0;
    else {
      // a neutral takes the direction both its neighbours agree on (a number counts as right-to-left inside right-to-left text)
      let left: 'R' | 'L' | null = null;
      for (let j = i - 1; j >= 0 && !left; j--) left = dir(k[j]);
      let right: 'R' | 'L' | null = null;
      for (let j = i + 1; j < k.length && !right; j++) right = dir(k[j]);
      const d = left && left === right ? left : rtlBase ? 'R' : 'L';
      out[i] = d === 'R' ? 1 : rtlBase ? 2 : 0;
    }
  }
  return out;
}

/** The runs of a line in visual order, left to right as they are drawn. `base` is the direction of the line (its alignment side). */
export function bidiRuns(text: string, base: 'ltr' | 'rtl'): Run[] {
  const chars = [...text];
  if (!chars.length) return [];
  const lv = levels(text, base);
  const runs: Array<{ text: string; level: number }> = [];
  chars.forEach((c, i) => {
    const last = runs[runs.length - 1];
    if (last && last.level === lv[i]) last.text += c;
    else runs.push({ text: c, level: lv[i] });
  });
  // L2: from the highest level down to the lowest odd one, reverse every sequence of runs at that level or higher
  const max = Math.max(...runs.map((r) => r.level));
  for (let level = max; level >= 1; level--) {
    for (let i = 0; i < runs.length; ) {
      if (runs[i].level < level) { i++; continue; }
      let j = i;
      while (j < runs.length && runs[j].level >= level) j++;
      const seg = runs.slice(i, j).reverse();
      runs.splice(i, j - i, ...seg);
      i = j;
    }
  }
  return runs.map((r) => ({ text: r.text, rtl: r.level % 2 === 1 }));
}

/** True when the text holds Arabic script, so the line is laid out right to left. */
export const hasArabic = (text: string): boolean => R.test(text) && [...text].some((c) => R.test(c) && !DIGIT.test(c));

const MIRROR: Record<string, string> = { '(': ')', ')': '(', '[': ']', ']': '[', '{': '}', '}': '{', '<': '>', '>': '<' };
const isArabicLetter = (c: string) => R.test(c) && !DIGIT.test(c);

/**
 * One drawable piece: a stretch of Arabic letters (drawn with the Arabic font, which shapes and orders them) or everything else
 * (digits, Latin, spaces, punctuation: drawn with the Latin font, which has the glyphs the Arabic font lacks: brackets, hyphens).
 */
export type Piece = { text: string; arabic: boolean };

/** The pieces of a line in visual order, left to right. Brackets inside right-to-left text are mirrored. */
export function bidiPieces(text: string, base: 'ltr' | 'rtl'): Piece[] {
  const out: Piece[] = [];
  for (const run of bidiRuns(text, base)) {
    const pieces: Piece[] = [];
    for (const c of run.text) {
      const arabic = isArabicLetter(c);
      const ch = !arabic && run.rtl && MIRROR[c] ? MIRROR[c] : c;
      const last = pieces[pieces.length - 1];
      if (last && last.arabic === arabic) last.text += ch;
      else pieces.push({ text: ch, arabic });
    }
    // a right-to-left run reads from its last piece to its first; the punctuation inside a piece is drawn left to right, so it is turned too
    if (run.rtl) for (const p of pieces) if (!p.arabic) p.text = [...p.text].reverse().join('');
    out.push(...(run.rtl ? pieces.reverse() : pieces));
  }
  return out;
}

/** What `drawBidi` needs from a pdfkit document (kept structural so the module has no pdfkit import). */
export interface PdfLike {
  font(name: string): PdfLike;
  fontSize(n: number): PdfLike;
  fillColor(c: string): PdfLike;
  widthOfString(s: string, o?: object): number;
  text(s: string, x?: number, y?: number, o?: object): PdfLike;
}

/**
 * Draws one line of mixed text. Arabic runs use `fonts.ar`, everything else `fonts.latin`. `x` and `width` are the box; `align` is
 * the side the line sits against (`right` for an Arabic line). Returns the width drawn. The line is not wrapped: callers wrap first.
 */
export function drawBidi(doc: PdfLike, text: string, x: number, y: number, width: number, opts: { fonts: { ar: string; latin: string }; align?: 'left' | 'right' | 'center'; base?: 'ltr' | 'rtl'; size?: number }): number {
  const base = opts.base ?? (hasArabic(text) ? 'rtl' : 'ltr');
  const align = opts.align ?? (base === 'rtl' ? 'right' : 'left');
  if (opts.size) doc.fontSize(opts.size);
  const pieces = bidiPieces(text, base).map((p) => {
    const font = p.arabic ? opts.fonts.ar : opts.fonts.latin;
    doc.font(font);
    return { ...p, font, w: doc.widthOfString(p.text) };
  });
  const total = pieces.reduce((s, p) => s + p.w, 0);
  let cx = align === 'right' ? x + width - total : align === 'center' ? x + (width - total) / 2 : x;
  for (const p of pieces) {
    doc.font(p.font);
    doc.text(p.text, cx, y, { lineBreak: false });
    cx += p.w;
  }
  return total;
}

/** The width `drawBidi` would use for this line. */
export function measureBidi(doc: PdfLike, text: string, opts: { fonts: { ar: string; latin: string }; base?: 'ltr' | 'rtl'; size?: number }): number {
  const base = opts.base ?? (hasArabic(text) ? 'rtl' : 'ltr');
  if (opts.size) doc.fontSize(opts.size);
  return bidiPieces(text, base).reduce((sum, p) => { doc.font(p.arabic ? opts.fonts.ar : opts.fonts.latin); return sum + doc.widthOfString(p.text); }, 0);
}

/** Breaks a logical line into lines no wider than `width`, at spaces (a word wider than the box stays whole). */
export function wrapBidi(doc: PdfLike, text: string, width: number, opts: { fonts: { ar: string; latin: string }; base?: 'ltr' | 'rtl'; size?: number }): string[] {
  const lines: string[] = [];
  let cur = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = cur ? `${cur} ${word}` : word;
    if (cur && measureBidi(doc, next, opts) > width) { lines.push(cur); cur = word; } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines;
}
