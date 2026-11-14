import * as fs from 'fs';
import * as path from 'path';

/**
 * Fonts for server-made PDFs. Noto Naskh draws Arabic (it has no Latin letters, brackets or hyphen), the standard Helvetica draws
 * everything else; `drawBidi` (pdf-bidi.ts) picks the font per piece of a line. The files ship in `assets/fonts`.
 */
const DIRS = [
  path.join(__dirname, '..', 'assets', 'fonts'), // dist/assets/fonts (nest assets copy)
  path.join(process.cwd(), 'dist', 'assets', 'fonts'),
  path.join(process.cwd(), 'src', 'assets', 'fonts'), // ts-node / tests
];

/** A real font file: not a 14-byte "404: Not Found" saved as .ttf (that once broke contract generation with "Unknown font format"). */
function isValidFont(p: string): boolean {
  try {
    if (fs.statSync(p).size < 1024) return false;
    const fd = fs.openSync(p, 'r');
    const head = Buffer.alloc(4);
    fs.readSync(fd, head, 0, 4, 0);
    fs.closeSync(fd);
    const sig = head.toString('latin1');
    return head.readUInt32BE(0) === 0x00010000 || sig === 'OTTO' || sig === 'true' || sig === 'ttcf';
  } catch {
    return false;
  }
}

export function fontPath(name: string): string | null {
  for (const d of DIRS) {
    const p = path.join(d, name);
    if (fs.existsSync(p) && isValidFont(p)) return p;
  }
  return null;
}

export interface PdfFontSets {
  reg: { ar: string; latin: string };
  bold: { ar: string; latin: string };
  /** False when no Arabic font file could be read: Arabic would print as blanks, so callers must refuse to build a PDF. */
  arabic: boolean;
}

/** Registers the Arabic fonts on a pdfkit document and returns the font names to pass to drawBidi. */
export function registerPdfFonts(doc: { registerFont(name: string, src: string): unknown }): PdfFontSets {
  const arReg = fontPath('NotoNaskhArabic-Regular.ttf');
  const arBold = fontPath('NotoNaskhArabic-Bold.ttf');
  if (arReg) doc.registerFont('ar', arReg);
  if (arBold) doc.registerFont('ar-b', arBold);
  return {
    reg: { ar: arReg ? 'ar' : 'Helvetica', latin: 'Helvetica' },
    bold: { ar: arBold ? 'ar-b' : arReg ? 'ar' : 'Helvetica-Bold', latin: 'Helvetica-Bold' },
    arabic: !!arReg,
  };
}

/**
 * pdfkit puts the top of a line at `y`, so two fonts with different ascenders draw their baselines at different heights: Latin
 * letters, digits and punctuation (Helvetica) float above the Arabic (Naskh) in one line. This wraps a document so that every
 * `text()` is moved down by the difference to the Arabic font's ascender, and all pieces of a line share one baseline.
 * The wrapped object is what goes to `drawBidi`, `wrapBidi` and `measureBidi` (pdf-bidi.ts is used unchanged).
 */
export function alignBaselines<T extends { font(name: string): any; text(s: string, x?: number, y?: number, o?: object): any; _font?: any; _fontSize?: number }>(doc: T, sets: PdfFontSets): T {
  const asc = new Map<string, number>();
  const prev = (doc as any)._font;
  for (const name of new Set([sets.reg.ar, sets.reg.latin, sets.bold.ar, sets.bold.latin])) {
    doc.font(name);
    asc.set(name, Number((doc as any)._font?.ascender) || 0);
  }
  if (prev) (doc as any)._font = prev;
  const reference = asc.get(sets.reg.ar) ?? 0;
  let current = sets.reg.latin;
  let proxy: any;
  proxy = new Proxy(doc as any, {
    get(target, prop) {
      if (prop === 'font') return (name: string) => { current = name; target.font(name); return proxy; };
      if (prop === 'text') {
        return (s: string, x?: number, y?: number, o?: object) => {
          const size = Number(target._fontSize) || 0;
          const shift = y === undefined ? 0 : ((reference - (asc.get(current) ?? reference)) / 1000) * size;
          target.text(s, x, y === undefined ? y : y + shift, o);
          return proxy;
        };
      }
      const v = target[prop as any];
      return typeof v === 'function' ? (...a: any[]) => { const r = v.apply(target, a); return r === target ? proxy : r; } : v;
    },
  });
  return proxy as T;
}
